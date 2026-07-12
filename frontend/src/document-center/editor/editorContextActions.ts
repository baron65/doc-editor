import type { CalloutKind } from '../callout/CalloutExtension';

export const CALLOUT_KIND_OPTIONS: Array<{ value: CalloutKind; label: string }> = [
  { value: 'info', label: '信息提示' },
  { value: 'warning', label: '注意事项' },
  { value: 'success', label: '成功提示' },
  { value: 'danger', label: '危险警告' },
];

export function getContextualActionLabels(active: { table: boolean; image: boolean }) {
  return [
    ...(active.table ? ['后插入列', '删除列', '后插入行', '删除行', '删除表格'] : []),
    ...(active.image ? ['替换图片', '替代文本', '图片说明'] : []),
  ];
}
