/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import Qs from 'qs';
import { SearchDropdownOption } from '../../components/SearchDropdown/SearchDropdown.interface';
import {
  QuerySearchFilterType,
  QuerySearchParams,
} from '../../components/TableQueries/TableQueries.interface';

export const createQueryFilter = (
  allFilter: SearchDropdownOption[],
  tableId: string
): QuerySearchFilterType => {
  const filter = {
    query: {
      bool: {
        must: [
          {
            bool: {
              should: allFilter.map((data) => ({
                term: { 'owner.id': data.key },
              })),
            },
          },
          { term: { 'queryUsedIn.id': tableId } },
        ],
      },
    },
  };

  return filter;
};

export const parseSearchParams = (param: string) => {
  return Qs.parse(
    param.startsWith('?') ? param.substring(1) : param
    // need to typecast into QuerySearchParams as Qs.parse returns as "Qs.ParsedQs" Type object
  ) as unknown as QuerySearchParams;
};
export const stringifySearchParams = (param: QuerySearchParams) => {
  return Qs.stringify(param);
};
