import type { Request, Response, NextFunction } from 'express';
import { isCloud, User, accountService, userService, errorManager } from '@nangohq/shared';
import { getUserAccountAndEnvironmentFromSession } from '../utils/utils.js';

class AccountController {
    async getAccount(req: Request, res: Response, next: NextFunction) {
        try {
            const { success: sessionSuccess, error: sessionError, response } = await getUserAccountAndEnvironmentFromSession(req);
            if (!sessionSuccess || response === null) {
                errorManager.errResFromNangoErr(res, sessionError);
                return;
            }
            const { account, user } = response;

            if (account.uuid === process.env['NANGO_ADMIN_UUID']) {
                account.is_admin = true;
            }

            delete account['uuid'];

            const users = await userService.getUsersByAccountId(account.id);
            const invitedUsers = await userService.getInvitedUsersByAccountId(account.id);

            const usersWithCurrentUser = users.map((invitedUser) => {
                if (invitedUser.email === user.email) {
                    invitedUser.currentUser = true;
                }
                return invitedUser;
            });

            res.status(200).send({ account, users: usersWithCurrentUser, invitedUsers });
        } catch (err) {
            next(err);
        }
    }

    async editAccount(req: Request, res: Response, next: NextFunction) {
        try {
            const { success: sessionSuccess, error: sessionError, response } = await getUserAccountAndEnvironmentFromSession(req);
            if (!sessionSuccess || response === null) {
                errorManager.errResFromNangoErr(res, sessionError);
                return;
            }
            const { account } = response;

            const name = req.body['name'];

            if (!name) {
                res.status(400).send({ error: 'Account name cannot be empty.' });
                return;
            }

            await accountService.editAccount(name, account.id);
            res.status(200).send({ name });
        } catch (err) {
            next(err);
        }
    }

    async switchAccount(req: Request, res: Response, next: NextFunction) {
        console.log(isCloud());
        //if (!isCloud()) {
        //res.status(400).send('Cannot switch account in self-hosted mode');
        //}
        try {
            const { success: sessionSuccess, error: sessionError, response } = await getUserAccountAndEnvironmentFromSession(req);
            if (!sessionSuccess || response === null) {
                errorManager.errResFromNangoErr(res, sessionError);
                return;
            }

            const { account } = response;

            if (account?.uuid !== process.env['NANGO_ADMIN_UUID']) {
                res.status(401).send('Unauthorized');
                return;
            }

            if (!req.body) {
                res.status(400).send('Missing request body');
                return;
            }

            const { account_uuid, login_reason } = req.body;

            if (!account_uuid) {
                res.status(400).send('Missing account_uuid');
                return;
            }

            if (!login_reason) {
                res.status(400).send('Missing login_reason');
                return;
            }

            const accountId = await accountService.getAccountIdByUuid(account_uuid);
            if (!accountId) {
                res.status(400).send('Invalid account_uuid');
                return;
            }
            const users = await userService.getUsersByAccountId(accountId);

            if (users.length === 0) {
                res.status(400).send('Cannot switch to account with no users');
                return;
            }

            const [firstUser] = users;

            // TODO write to this users activity log

            //if (isCloud()) {
            //req.session.destroy((err) => {
            //if (err) {
            //next(err);
            //}
            //res.clearCookie('nango_session');
            //});
            //}
            console.log(firstUser);

            req.login(firstUser as User, (err) => {
                if (err) {
                    next(err);
                    return;
                }
            });

            res.status(200).send({ success: true });
        } catch (err) {
            next(err);
        }
    }
}

export default new AccountController();
