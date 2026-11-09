import { handleWhatToWear, type WtwEnv } from '../lib/wtw-render'

export const onRequestGet: PagesFunction<WtwEnv> = (context) =>
  handleWhatToWear(context.request, context.env, 'en')
