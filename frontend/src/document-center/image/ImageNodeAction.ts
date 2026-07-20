export const IMAGE_NODE_ACTION_EVENT = 'document-center:image-node-action';

export type ImageNodeAction = 'replace' | 'alt' | 'caption';

export interface ImageNodeActionDetail {
  action: ImageNodeAction;
  position: number;
}
