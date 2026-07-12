export function shouldConfirmEditorNavigation(
  hasPendingWork: boolean,
  currentDocumentId: string,
  targetDocumentId: string,
) {
  return hasPendingWork && currentDocumentId !== targetDocumentId;
}
