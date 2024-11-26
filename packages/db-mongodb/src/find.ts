import type { PaginateOptions } from 'mongoose'
import type { Find, PayloadRequest } from 'payload'

import { flattenWhereToOperators } from 'payload'

import type { MongooseAdapter } from './index.js'

import { getSession } from './getSession.js'
import { buildSortParam } from './queries/buildSortParam.js'
import { buildJoinAggregation } from './utilities/buildJoinAggregation.js'
import { buildProjectionFromSelect } from './utilities/buildProjectionFromSelect.js'
import { transform } from './utilities/transform.js'

export const find: Find = async function find(
  this: MongooseAdapter,
  {
    collection,
    joins = {},
    limit = 0,
    locale,
    page,
    pagination,
    projection,
    req = {} as PayloadRequest,
    select,
    sort: sortArg,
    where,
  },
) {
  const Model = this.collections[collection]
  const collectionConfig = this.payload.collections[collection].config
  const session = await getSession(this, req)

  let hasNearConstraint = false

  if (where) {
    const constraints = flattenWhereToOperators(where)
    hasNearConstraint = constraints.some((prop) => Object.keys(prop).some((key) => key === 'near'))
  }

  const fields = collectionConfig.flattenedFields

  let sort
  if (!hasNearConstraint) {
    sort = buildSortParam({
      config: this.payload.config,
      fields,
      locale,
      sort: sortArg || collectionConfig.defaultSort,
      timestamps: true,
    })
  }

  const query = await Model.buildQuery({
    locale,
    payload: this.payload,
    where,
  })

  // useEstimatedCount is faster, but not accurate, as it ignores any filters. It is thus set to true if there are no filters.
  const useEstimatedCount = hasNearConstraint || !query || Object.keys(query).length === 0
  const paginationOptions: PaginateOptions = {
    lean: true,
    leanWithId: true,
    options: { session },
    page,
    pagination,
    projection,
    sort,
    useEstimatedCount,
  }

  if (select) {
    paginationOptions.projection = buildProjectionFromSelect({
      adapter: this,
      fields,
      select,
    })
  }

  if (this.collation) {
    const defaultLocale = 'en'
    paginationOptions.collation = {
      locale: locale && locale !== 'all' && locale !== '*' ? locale : defaultLocale,
      ...this.collation,
    }
  }

  if (!useEstimatedCount && Object.keys(query).length === 0 && this.disableIndexHints !== true) {
    // Improve the performance of the countDocuments query which is used if useEstimatedCount is set to false by adding
    // a hint. By default, if no hint is provided, MongoDB does not use an indexed field to count the returned documents,
    // which makes queries very slow. This only happens when no query (filter) is provided. If one is provided, it uses
    // the correct indexed field
    paginationOptions.useCustomCountFn = () => {
      return Promise.resolve(
        Model.countDocuments(query, {
          hint: { _id: 1 },
          session,
        }),
      )
    }
  }

  if (limit >= 0) {
    paginationOptions.limit = limit
    // limit must also be set here, it's ignored when pagination is false
    paginationOptions.options.limit = limit

    // Disable pagination if limit is 0
    if (limit === 0) {
      paginationOptions.pagination = false
    }
  }

  let result

  const aggregate = await buildJoinAggregation({
    adapter: this,
    collection,
    collectionConfig,
    joins,
    locale,
    query,
  })
  // build join aggregation
  if (aggregate) {
    result = await Model.aggregatePaginate(Model.aggregate(aggregate), paginationOptions)
  } else {
    result = await Model.paginate(query, paginationOptions)
  }

  transform({ type: 'read', adapter: this, data: result.docs, fields })

  return result
}
