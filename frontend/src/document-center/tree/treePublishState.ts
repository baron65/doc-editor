import type { DocumentPublishState } from '../../types/documentCenter';

interface PublishStatePresentation {
  label: string;
  className: string;
}

const presentations: Record<DocumentPublishState, PublishStatePresentation> = {
  DRAFT: {
    label: '草稿',
    className: 'bg-gray-100 text-gray-500',
  },
  PUBLISHED: {
    label: '已发布',
    className: 'bg-green-50 text-green-700',
  },
  PUBLISHED_WITH_CHANGES: {
    label: '待发布更新',
    className: 'bg-amber-50 text-amber-700',
  },
};

export function getPublishStatePresentation(state: DocumentPublishState) {
  return presentations[state];
}
