import * as React from 'react';

export interface ProtocolNode {
    type: string;
}

export type ProtocolRendererMap<Node extends ProtocolNode, Context> = Record<string,
    React.ComponentType<{node: Node; context: Context}>>;

export function ProtocolRenderer<Node extends ProtocolNode, Context>({node, context, renderers, fallback}: {
    node: Node;
    context: Context;
    renderers: ProtocolRendererMap<Node, Context>;
    fallback?: React.ReactNode;
}) {
    const Component = renderers[node.type];
    return Component ? <Component node={node} context={context} /> : <>{fallback || null}</>;
}

export function ProtocolList<Node extends ProtocolNode, Context>({nodes, context, renderers}: {
    nodes: Node[];
    context: Context;
    renderers: ProtocolRendererMap<Node, Context>;
}) {
    return <>{nodes.map((node, index) =>
        <ProtocolRenderer key={`${node.type}-${index}`} node={node} context={context} renderers={renderers} />
    )}</>;
}
