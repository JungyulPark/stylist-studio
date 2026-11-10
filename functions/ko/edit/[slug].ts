import { handleEdit } from '../../lib/edit-render'

export const onRequestGet: PagesFunction = (context) => handleEdit('ko', (context.params as { slug: string }).slug)
