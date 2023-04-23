import { forwardRef, useCallback, useState } from 'react';
import classNames from 'classnames';
import CopyButton from './button/CopyButton';

type SecretInputProps = Omit<JSX.IntrinsicElements['input'], 'defaultValue'> & { copy?: boolean; defaultValue?: string };

const SecretInput = forwardRef<HTMLInputElement, SecretInputProps>(function PasswordField({ className, copy, ...props }, ref) {
    const [isSecretVisible, setIsSecretVisible] = useState(false);

    const [changedValue, setChangedValue] = useState(props.defaultValue);

    const toggleSecretVisibility = useCallback(() => setIsSecretVisible(!isSecretVisible), [isSecretVisible, setIsSecretVisible]);

    return (
        <div className="relative flex">
            <input
                type={isSecretVisible ? 'text' : 'password'}
                ref={ref}
                className={classNames(
                    'border-border-gray bg-bg-black text-text-light-gray focus:border-white focus:ring-white block h-11 w-full appearance-none rounded-md border px-3 py-2 text-base placeholder-gray-400 shadow-sm focus:outline-none',
                    className
                )}
                value={changedValue}
                onChange={(e) => setChangedValue(e.currentTarget.value)}
                {...props}
            />
            <span className="absolute right-4 top-2 flex items-center">
                <span onClick={toggleSecretVisibility} className="bg-gray-300 hover:bg-gray-400 rounded px-2 py-1 text-sm text-gray-600 cursor-pointer">
                    {isSecretVisible ? 'hide' : 'show'}
                </span>
                {copy && <CopyButton text={changedValue!} />}
            </span>
        </div>
    );
});

export default SecretInput;
