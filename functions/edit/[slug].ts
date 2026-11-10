import { handleEdit } from '../lib/edit-render'

export const onRequestGet: PagesFunction = (context) => handleEdit('en', (context.params as { slug: string }).slug)
