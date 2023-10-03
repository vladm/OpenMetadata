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
import { NextPreviousProps } from '../../../../components/common/next-previous/NextPrevious.interface';
import { OperationPermission } from '../../../../components/PermissionProvider/PermissionProvider.interface';
import { Team } from '../../../../generated/entity/teams/team';
import { User } from '../../../../generated/entity/teams/user';
import { EntityReference } from '../../../../generated/type/entityReference';
import { Paging } from '../../../../generated/type/paging';

export interface UserTabProps {
  users: User[];
  searchText: string;
  isLoading: number;
  permission: OperationPermission;
  currentTeam: Team;
  onSearchUsers: (text: string) => void;
  onAddUser: (data: EntityReference[]) => void;
  paging: Paging;
  onChangePaging: NextPreviousProps['pagingHandler'];
  currentPage: number;
  onRemoveUser: (id: string) => Promise<void>;
}
