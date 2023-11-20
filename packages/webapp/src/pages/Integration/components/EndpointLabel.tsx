import { FlowEndpoint } from '../../../types';
import { HttpLabel, GET, POST } from '../../../components/ui/label/http';

export default function EndpointRow({ type, endpoint }: {type: string; endpoint : string | FlowEndpoint}) {
    return (
        <>
            {typeof endpoint === 'object' ? (
                    <HttpLabel endpoint={endpoint as FlowEndpoint} />
            ) : (
                <>
                    {(endpoint as unknown as string)?.split(' ').length === 1 && (type === 'sync') && (
                        <GET path={endpoint as unknown as string} />
                    )}
                    {(endpoint as unknown as string)?.split(' ').length === 1 && (type === 'action') && (
                        <POST path={endpoint as unknown as string} />
                    )}
                    <HttpLabel endpoint={{[((endpoint as unknown as string)?.split(' ')[0] as string)]: (endpoint as unknown as string)?.split(' ')[1]} as FlowEndpoint} />
                </>
            )}
        </>
    );
}
