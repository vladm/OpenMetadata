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
import { useState } from 'react';
import { PAGE_SIZE_BASE, pagingObject } from '../../constants/constants';
import { Paging } from '../../generated/type/paging';

export const usePaging = () => {
  const [paging, setPaging] = useState<Paging>(pagingObject);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_BASE);

  return {
    paging,
    handlePagingChange: setPaging,
    currentPage,
    handlePageChange: setCurrentPage,
    pageSize,
    handlePageSizeChange: setPageSize,
  };
};
