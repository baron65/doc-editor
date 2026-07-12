import type { DocumentPublishState } from '../../types/documentCenter';

interface PublishActionPresentation {
  label: string;
  enabled: boolean;
}

const actions: Record<DocumentPublishState, PublishActionPresentation> = {
  DRAFT: { label: '发布', enabled: true },
  PUBLISHED: { label: '已发布', enabled: false },
  PUBLISHED_WITH_CHANGES: { label: '发布更新', enabled: true },
};

export function getPublishActionPresentation(state: DocumentPublishState) {
  return actions[state];
}
