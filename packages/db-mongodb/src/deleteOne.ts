import type { DeleteOne, PayloadRequest } from 'payload'

import type { MongooseAdapter } from './index.js'

import { getSession } from './getSession.js'
import { buildProjectionFromSelect } from './utilities/buildProjectionFromSelect.js'
import { transform } from './utilities/transform.js'

export const deleteOne: DeleteOne = async function deleteOne(
  this: MongooseAdapter,
  { collection, req = {} as PayloadRequest, select, where },
) {
  const Model = this.collections[collection]
  const session = await getSession(this, req)

  const query = await Model.buildQuery({
    payload: this.payload,
    where,
  })

  const fields = this.payload.collections[collection].config.fields

  const doc = await Model.collection.findOneAndDelete(query, {
    projection: buildProjectionFromSelect({
      adapter: this,
      fields: this.payload.collections[collection].config.flattenedFields,
      select,
    }),
    session,
  })

  transform({
    type: 'read',
    adapter: this,
    data: doc,
    fields,
  })

  return doc
}
