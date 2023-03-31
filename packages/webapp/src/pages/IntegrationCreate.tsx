import TopNavBar from '../components/TopNavBar';
import LeftNavBar, { LeftNavBarItems } from '../components/LeftNavBar';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import {
    useGetIntegrationDetailsAPI,
    useGetProvidersAPI,
    useGetProjectInfoAPI,
    useEditIntegrationAPI,
    useCreateIntegrationAPI,
    useDeleteIntegrationAPI
} from '../utils/api';
import AlertOverLay from '../components/AlertOverLay';
import { HelpCircle } from '@geist-ui/icons';
import { Tooltip } from '@geist-ui/core';
import { defaultCallback } from '../utils/utils';
import { Prism } from '@mantine/prism';

interface Integration {
    uniqueKey: string;
    provider: string;
    clientId: string;
    clientSecret: string;
    scopes: string;
}

export default function IntegrationCreate() {
    const [loaded, setLoaded] = useState(false);
    const [serverErrorMessage, setServerErrorMessage] = useState('');
    const [providers, setProviders] = useState<string[] | null>(null);
    const [integration, setIntegration] = useState<Integration | null>(null);
    const [deleteAlertState, setDeleteAlertState] = useState<boolean>(false);
    const navigate = useNavigate();
    const { providerConfigKey } = useParams();
    const [templateLogo, setTemplateLogo] = useState<string>('');
    const [callbackUrl, setCallbackUrl] = useState('');
    const getIntegrationDetailsAPI = useGetIntegrationDetailsAPI();
    const getProvidersAPI = useGetProvidersAPI();
    const getProjectInfoAPI = useGetProjectInfoAPI();
    const editIntegrationAPI = useEditIntegrationAPI();
    const createIntegrationAPI = useCreateIntegrationAPI();
    const deleteIntegrationAPI = useDeleteIntegrationAPI();

    useEffect(() => {
        const getProviders = async () => {
            if (providerConfigKey) {
                // Edit integration.
                let res = await getIntegrationDetailsAPI(providerConfigKey);

                if (res?.status === 200) {
                    let data = await res.json();
                    setIntegration(data['integration']);
                }
            } else {
                // Create integration
                let res = await getProvidersAPI();

                if (res?.status === 200) {
                    let data = await res.json();
                    setProviders(data['providers']);
                }
            }
        };

        const getAccount = async () => {
            let res = await getProjectInfoAPI();

            if (res?.status === 200) {
                const account = (await res.json())['account'];
                setCallbackUrl(account.callback_url || defaultCallback());
            }
        };

        if (!loaded) {
            setLoaded(true);
            getProviders();
            getAccount();
        }
    }, [providerConfigKey, getIntegrationDetailsAPI, getProvidersAPI, getProjectInfoAPI, loaded, setLoaded]);

    const handleSave = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setServerErrorMessage('');

        if (providerConfigKey) {
            if (!integration) {
                return;
            }

            const target = e.target as typeof e.target & {
                client_id: { value: string };
                client_secret: { value: string };
                scopes: { value: string };
            };

            let res = await editIntegrationAPI(
                integration.provider,
                providerConfigKey,
                target.client_id.value,
                target.client_secret.value,
                target.scopes.value
            );

            if (res?.status === 200) {
                toast.success('Integration updated!', { position: toast.POSITION.BOTTOM_CENTER });
                navigate('/integrations', { replace: true });
            }
        } else {
            const target = e.target as typeof e.target & {
                provider: { value: string };
                unique_key: { value: string };
                client_id: { value: string };
                client_secret: { value: string };
                scopes: { value: string };
            };

            let res = await createIntegrationAPI(
                target.provider.value,
                target.unique_key.value,
                target.client_id.value,
                target.client_secret.value,
                target.scopes.value
            );

            if (res?.status === 200) {
                toast.success('Integration created!', { position: toast.POSITION.BOTTOM_CENTER });
                navigate('/integrations', { replace: true });
            } else if (res != null) {
                let payload = await res.json();
                toast.error(payload.type === 'duplicate_provider_config' ? 'Unique Key already exists.' : payload.error, {
                    position: toast.POSITION.BOTTOM_CENTER
                });
            }
        }
    };

    const deleteButtonClicked = async () => {
        setDeleteAlertState(true);
    };

    const acceptDeleteButtonClicked = async () => {
        if (!providerConfigKey) return;

        let res = await deleteIntegrationAPI(providerConfigKey);

        if (res?.status === 200) {
            toast.success('Integration deleted!', { position: toast.POSITION.BOTTOM_CENTER });
            navigate('/integrations', { replace: true });
        }
    };

    const rejectDeleteButtonClicked = () => {
        setDeleteAlertState(false);
    };

    if (integration != null && templateLogo === '') {
        setTemplateLogo(`images/template-logos/${integration.provider}.svg`);
    }

    return (
        <div className="h-full">
            <TopNavBar />
            <div className="flex h-full">
                {deleteAlertState && (
                    <AlertOverLay
                        message={'Deleting an integration will also permanently delete all associated connections. Are you sure you want to delete it?'}
                        title={`Delete ${providerConfigKey}!`}
                        onAccept={acceptDeleteButtonClicked}
                        onCancel={rejectDeleteButtonClicked}
                    />
                )}
                <LeftNavBar selectedItem={LeftNavBarItems.Integrations} />
                <div className="ml-60 w-full mt-14">
                    {(providers || integration) && (
                        <div className="mx-auto w-largebox pb-40">
                            <h2 className="mx-20 mt-16 text-left text-3xl font-semibold tracking-tight text-white mb-12">Add New Integration</h2>
                            <div className="mx-20 h-fit border border-border-gray rounded-md text-white text-sm py-14 px-8">
                                <form className="space-y-6" onSubmit={handleSave}>
                                    {!providerConfigKey && providers && (
                                        <div>
                                            <div>
                                                <div className="flex">
                                                    <label htmlFor="provider" className="text-text-light-gray block text-sm font-semibold">
                                                        Integration Provider
                                                    </label>
                                                </div>
                                                <div className="mt-1">
                                                    <select
                                                        id="provider"
                                                        name="provider"
                                                        className="border-border-gray bg-bg-black text-text-light-gray block h-11 w-full appearance-none rounded-md border px-3 py-2 text-base shadow-sm active:outline-none focus:outline-none active:border-white focus:border-white"
                                                    >
                                                        {providers.map((provider) => (
                                                            <option>{provider}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex mt-6">
                                                    <label htmlFor="unique_key" className="text-text-light-gray block text-sm font-semibold">
                                                        Integration Unique Key
                                                    </label>
                                                    <Tooltip
                                                        text={
                                                            <>
                                                                <div className="flex text-black text-sm">
                                                                    <p>{`Choose a unique key for your integration. It can be the same as the Integration Provider (e.g. 'github').`}</p>
                                                                </div>
                                                            </>
                                                        }
                                                    >
                                                        <HelpCircle color="gray" className="h-5 ml-1"></HelpCircle>
                                                    </Tooltip>
                                                </div>

                                                <div className="mt-1">
                                                    <input
                                                        id="unique_key"
                                                        name="unique_key"
                                                        type="text"
                                                        required
                                                        minLength={1}
                                                        className="border-border-gray bg-bg-black text-text-light-gray focus:border-white focus:ring-white block h-11 w-full appearance-none rounded-md border px-3 py-2 text-base placeholder-gray-400 shadow-sm focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {providerConfigKey && integration && (
                                        <div>
                                            <div className="">
                                                <label htmlFor="email" className="text-text-light-gray block text-sm font-semibold">
                                                    Integration Template
                                                </label>
                                                <div className="mt-3 mb-5 flex">
                                                    {/* <img src={templateLogo} /> */}
                                                    <p className="">{`${integration.provider}`}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="email" className="text-text-light-gray block text-sm font-semibold">
                                                    Integration Unique Key
                                                </label>
                                                <p className="mt-3 mb-5">{`${providerConfigKey}`}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex">
                                            <label htmlFor="client_id" className="text-text-light-gray block text-sm font-semibold">
                                                Client ID
                                            </label>
                                            <Tooltip
                                                text={
                                                    <>
                                                        <div className="flex text-black text-sm">
                                                            <p>{`Obtain the Client ID on the developer portal of the Integration Provider.`}</p>
                                                        </div>
                                                    </>
                                                }
                                            >
                                                <HelpCircle color="gray" className="h-5 ml-1"></HelpCircle>
                                            </Tooltip>
                                        </div>
                                        <div className="mt-1">
                                            <input
                                                id="client_id"
                                                name="client_id"
                                                type="text"
                                                defaultValue={integration ? integration.clientId : ''}
                                                required
                                                minLength={1}
                                                className="border-border-gray bg-bg-black text-text-light-gray focus:border-white focus:ring-white block h-11 w-full appearance-none rounded-md border px-3 py-2 text-base placeholder-gray-400 shadow-sm focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex">
                                            <label htmlFor="client_id" className="text-text-light-gray block text-sm font-semibold">
                                                Client Secret
                                            </label>
                                            <Tooltip
                                                text={
                                                    <>
                                                        <div className="flex text-black text-sm">
                                                            <p>{`Obtain the Client Secret on the developer portal of the Integration Provider.`}</p>
                                                        </div>
                                                    </>
                                                }
                                            >
                                                <HelpCircle color="gray" className="h-5 ml-1"></HelpCircle>
                                            </Tooltip>
                                        </div>
                                        <div className="mt-1">
                                            <input
                                                id="client_secret"
                                                name="client_secret"
                                                type="text"
                                                defaultValue={integration ? integration.clientSecret : ''}
                                                required
                                                className="border-border-gray bg-bg-black text-text-light-gray focus:ring-white block h-11 w-full appearance-none rounded-md border px-3 py-2 text-base placeholder-gray-400 shadow-sm focus:border-white focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex">
                                            <label htmlFor="client_id" className="text-text-light-gray block text-sm font-semibold">
                                                Scopes
                                            </label>
                                            <Tooltip
                                                text={
                                                    <>
                                                        <div className="flex text-black text-sm">
                                                            <p>{`Comma-separated ('scope1,scope2,scope3').\n Scopes are documented on the developer portal of the Integration Provider.`}</p>
                                                        </div>
                                                    </>
                                                }
                                            >
                                                <HelpCircle color="gray" className="h-5 ml-1"></HelpCircle>
                                            </Tooltip>
                                        </div>
                                        <div className="mt-1">
                                            <input
                                                id="scopes"
                                                name="scopes"
                                                type="text"
                                                defaultValue={integration ? integration.scopes : ''}
                                                required
                                                minLength={1}
                                                className="border-border-gray bg-bg-black text-text-light-gray block h-11 w-full appearance-none rounded-md border px-3 py-2 text-base placeholder-gray-400 shadow-sm focus:border-white focus:outline-none focus:ring-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div>
                                            <div className="flex">
                                                <label htmlFor="client_id" className="text-text-light-gray block text-sm font-semibold">
                                                    Callback URL
                                                </label>
                                                <Tooltip
                                                    text={
                                                        <>
                                                            <div className="flex text-black text-sm">
                                                                <p>{`Register this callback URL on the developer portal of the Integration Provider.`}</p>
                                                            </div>
                                                        </>
                                                    }
                                                >
                                                    <HelpCircle color="gray" className="h-5 ml-1"></HelpCircle>
                                                </Tooltip>
                                            </div>
                                            <Prism language="bash" colorScheme="dark">
                                                {callbackUrl}
                                            </Prism>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between">
                                            <button
                                                type="submit"
                                                className="bg-white mt-4 h-8 rounded-md hover:bg-gray-300 border px-3 pt-0.5 text-sm text-black"
                                            >
                                                Save
                                            </button>
                                            {providerConfigKey && integration && (
                                                <button
                                                    type="button"
                                                    className="mt-4 flex h-8 rounded-md pl-3 pr-3 pt-1.5 text-sm text-white hover:bg-red-400 bg-red-600"
                                                    onClick={deleteButtonClicked}
                                                >
                                                    <p>Delete</p>
                                                </button>
                                            )}
                                        </div>
                                        {serverErrorMessage && <p className="mt-6 text-sm text-red-600">{serverErrorMessage}</p>}
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
