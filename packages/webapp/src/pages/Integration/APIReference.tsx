import { Fragment } from 'react';
import { Tabs, EndpointResponse } from './Show';
import EndpointRow from './components/EndpointRow';
import HelpFooter from './components/HelpFooter';
import { IntegrationConfig, Account } from '../../types';

interface APIReferenceProps {
    integration: IntegrationConfig | null;
    setActiveTab: (tab: Tabs) => void;
    endpoints: EndpointResponse;
    account: Account;
}

export default function APIReference(props: APIReferenceProps) {
    const { integration, endpoints } = props;

    const allFlows = [...endpoints?.enabledFlows?.syncs || [], ...endpoints?.enabledFlows?.actions || [], ...endpoints?.unEnabledFlows?.syncs || [], ...endpoints?.unEnabledFlows?.actions || []];
    // if any element in the array has elements in the endpoints array then return true
    const hasEndpoints = allFlows.some((flow) => flow.endpoints.length > 0);

    return (
        <div className="h-fit rounded-md text-white text-sm">
            {!hasEndpoints ? (
                <div className="flex flex-col border border-border-gray rounded-md text-white text-sm text-center p-10">
                    <h2 className="text-xl text-center w-full">Integrate with {integration?.provider}</h2>
                    <div className="mt-4 text-gray-400">{integration?.provider} does not yet have publicly available endpoints on Nango.</div>
                    <HelpFooter type="Endpoints" />
                </div>
            ) : (
                <>
                    <table className="w-[976px]">
                        <tbody className="flex flex-col">
                            <tr>
                                <td className="flex items-center px-3 justify-between text-xs px-2 py-2 bg-active-gray border border-neutral-800 rounded-md">
                                    <div className="w-48">Endpoint</div>
                                    <div className="w-64">Description</div>
                                    <div className="w-48">Source</div>
                                    <div className="">Sync/Action Info</div>
                                </td>
                            </tr>
                            {allFlows.map((flow, flowIndex) => (
                                <Fragment key={flowIndex}>
                                    {flow.endpoints.map((endpoint, index: number) => (
                                        <tr key={`tr-${flow.name}-${flowIndex}-${index}`}>
                                            <EndpointRow
                                                flow={flow}
                                                endpoint={endpoint}
                                                integration={integration}
                                                source={
                                                    flow.is_public ? 'Public' : 'Custom'
                                                }
                                            />
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                    <HelpFooter />
                </>
            )}
        </div>
    );
}
