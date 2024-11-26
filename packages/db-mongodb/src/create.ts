import type { Create, PayloadRequest } from 'payload'

import type { MongooseAdapter } from './index.js'

import { getSession } from './getSession.js'
import { handleError } from './utilities/handleError.js'
import { transform } from './utilities/transform.js'

export const create: Create = async function create(
  this: MongooseAdapter,
  { collection, data, req = {} as PayloadRequest },
) {
  const Model = this.collections[collection]
  const session = await getSession(this, req)

  const fields = this.payload.collections[collection].config.fields

  if (this.payload.collections[collection].customIDType) {
    data._id = data.id
  }

  transform({
    type: 'write',
    adapter: this,
    collectionSlug: collection,
    data,
    fields,
    insert: true,
  })

  try {
    const { insertedId } = await Model.collection.insertOne(data, { session })
    data._id = insertedId

    transform({
      type: 'read',
      adapter: this,
      data,
      fields,
    })

    return data
  } catch (error) {
    handleError({ collection, error, req })
  }
}
