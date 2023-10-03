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
import { PlusOutlined } from '@ant-design/icons';
import { Button, Col, Row, Space, Tooltip } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { isEmpty, orderBy } from 'lodash';
import QueryString from 'qs';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ReactComponent as ExportIcon } from '../../../../assets/svg/ic-export.svg';
import { ReactComponent as ImportIcon } from '../../../../assets/svg/ic-import.svg';
import { ReactComponent as IconRemove } from '../../../../assets/svg/ic-remove.svg';
import ManageButton from '../../../../components/common/entityPageInfo/ManageButton/ManageButton';
import ErrorPlaceHolder from '../../../../components/common/error-with-placeholder/ErrorPlaceHolder';
import FilterTablePlaceHolder from '../../../../components/common/error-with-placeholder/FilterTablePlaceHolder';
import { ManageButtonItemLabel } from '../../../../components/common/ManageButtonContentItem/ManageButtonContentItem.component';
import NextPrevious from '../../../../components/common/next-previous/NextPrevious';
import Searchbar from '../../../../components/common/searchbar/Searchbar';
import Table from '../../../../components/common/Table/Table';
import { UserSelectableList } from '../../../../components/common/UserSelectableList/UserSelectableList.component';
import { useEntityExportModalProvider } from '../../../../components/Entity/EntityExportModalProvider/EntityExportModalProvider.component';
import ConfirmationModal from '../../../../components/Modals/ConfirmationModal/ConfirmationModal';
import { commonUserDetailColumns } from '../../../../components/Users/Users.util';
import { PAGE_SIZE_MEDIUM } from '../../../../constants/constants';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../../../../constants/GlobalSettings.constants';
import { ERROR_PLACEHOLDER_TYPE } from '../../../../enums/common.enum';
import { EntityAction } from '../../../../enums/entity.enum';
import { User } from '../../../../generated/entity/teams/user';
import { EntityReference } from '../../../../generated/entity/type';
import { ImportType } from '../../../../pages/teams/ImportTeamsPage/ImportTeamsPage.interface';
import { exportUserOfTeam } from '../../../../rest/teamsAPI';
import { getEntityName } from '../../../../utils/EntityUtils';
import { getSettingsPathWithFqn } from '../../../../utils/RouterUtils';
import { UserTabProps } from './UserTab.interface';

export const UserTab = ({
  users,
  searchText,
  isLoading,
  permission,
  currentTeam,
  onSearchUsers,
  onAddUser,
  paging,
  onChangePaging,
  currentPage,
  onRemoveUser,
}: UserTabProps) => {
  const { t } = useTranslation();
  const history = useHistory();

  const [deletingUser, setDeletingUser] = useState<EntityReference>();
  const { showModal } = useEntityExportModalProvider();
  const handleRemoveClick = (id: string) => {
    const user = currentTeam.users?.find((u) => u.id === id);
    setDeletingUser(user);
  };

  const columns: ColumnsType<User> = useMemo(() => {
    return [
      ...commonUserDetailColumns(),
      {
        title: t('label.action-plural'),
        dataIndex: 'actions',
        key: 'actions',
        width: 90,
        render: (_, record) => (
          <Space
            align="center"
            className="w-full justify-center remove-icon"
            size={8}>
            <Tooltip
              placement="bottomRight"
              title={
                permission.EditAll
                  ? t('label.remove')
                  : t('message.no-permission-for-action')
              }>
              <Button
                data-testid="remove-user-btn"
                disabled={!permission.EditAll}
                icon={
                  <IconRemove height={16} name={t('label.remove')} width={16} />
                }
                type="text"
                onClick={() => handleRemoveClick(record.id)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ];
  }, [handleRemoveClick, permission]);

  const sortedUser = useMemo(() => orderBy(users, ['name'], 'asc'), [users]);

  const handleUserExportClick = useCallback(async () => {
    if (currentTeam?.name) {
      showModal({
        name: currentTeam.name,
        onExport: exportUserOfTeam,
      });
    }
  }, [currentTeam, exportUserOfTeam]);

  const handleImportClick = useCallback(async () => {
    history.push({
      pathname: getSettingsPathWithFqn(
        GlobalSettingsMenuCategory.MEMBERS,
        GlobalSettingOptions.TEAMS,
        currentTeam.name,
        EntityAction.IMPORT
      ),
      search: QueryString.stringify({ type: ImportType.USERS }),
    });
  }, []);

  const IMPORT_EXPORT_MENU_ITEM = useMemo(() => {
    const option = [
      {
        label: (
          <ManageButtonItemLabel
            description={t('message.export-entity-help', {
              entity: t('label.user-lowercase'),
            })}
            icon={<ExportIcon width="18px" />}
            id="export"
            name={t('label.export')}
          />
        ),

        onClick: handleUserExportClick,
        key: 'export-button',
      },
    ];
    if (permission.EditAll) {
      option.push({
        label: (
          <ManageButtonItemLabel
            description={t('message.import-entity-help', {
              entity: t('label.team-lowercase'),
            })}
            icon={<ImportIcon width="20px" />}
            id="import-button"
            name={t('label.import')}
          />
        ),
        onClick: handleImportClick,
        key: 'import-button',
      });
    }

    return option;
  }, [handleUserExportClick, handleImportClick, permission]);

  const handleRemoveUser = () => {
    if (deletingUser?.id) {
      onRemoveUser(deletingUser.id).then(() => {
        setDeletingUser(undefined);
      });
    }
  };

  if (isEmpty(users) && !searchText && isLoading <= 0) {
    return (
      <ErrorPlaceHolder
        button={
          <Space>
            <UserSelectableList
              hasPermission
              selectedUsers={currentTeam.users ?? []}
              onUpdate={onAddUser}>
              <Button
                ghost
                className="p-x-lg"
                data-testid="add-new-user"
                icon={<PlusOutlined />}
                title={
                  permission.EditAll
                    ? t('label.add-new-entity', { entity: t('label.user') })
                    : t('message.no-permission-for-action')
                }
                type="primary">
                {t('label.add')}
              </Button>
            </UserSelectableList>
            <ManageButton
              canDelete={false}
              entityName={currentTeam.name}
              extraDropdownContent={IMPORT_EXPORT_MENU_ITEM}
            />
          </Space>
        }
        className="mt-0-important"
        heading={t('label.user')}
        permission={permission.EditAll}
        type={ERROR_PLACEHOLDER_TYPE.ASSIGN}
      />
    );
  }

  return (
    <Row className="p-md" gutter={[16, 16]}>
      <Col span={24}>
        <Row justify="space-between">
          <Col span={8}>
            <Searchbar
              removeMargin
              placeholder={t('label.search-for-type', {
                type: t('label.user-lowercase'),
              })}
              searchValue={searchText}
              typingInterval={500}
              onSearch={onSearchUsers}
            />
          </Col>
          <Col>
            <Space>
              {users.length > 0 && permission.EditAll && (
                <UserSelectableList
                  hasPermission
                  selectedUsers={currentTeam.users ?? []}
                  onUpdate={onAddUser}>
                  <Button data-testid="add-new-user" type="primary">
                    {t('label.add-entity', { entity: t('label.user') })}
                  </Button>
                </UserSelectableList>
              )}
              <ManageButton
                canDelete={false}
                entityName={currentTeam.name}
                extraDropdownContent={IMPORT_EXPORT_MENU_ITEM}
              />
            </Space>
          </Col>
        </Row>
      </Col>
      <Col span={24}>
        <Table
          bordered
          className="teams-list-table"
          columns={columns}
          dataSource={sortedUser}
          loading={isLoading > 0}
          locale={{
            emptyText: <FilterTablePlaceHolder />,
          }}
          pagination={false}
          rowKey="name"
          size="small"
        />
        {paging.total > PAGE_SIZE_MEDIUM && (
          <NextPrevious
            currentPage={currentPage}
            isNumberBased={Boolean(searchText)}
            pageSize={PAGE_SIZE_MEDIUM}
            paging={paging}
            pagingHandler={onChangePaging}
          />
        )}
      </Col>

      <ConfirmationModal
        bodyText={t('message.are-you-sure-want-to-text', {
          text: t('label.remove-entity', {
            entity: getEntityName(deletingUser),
          }),
        })}
        cancelText={t('label.cancel')}
        confirmText={t('label.confirm')}
        header={t('label.removing-user')}
        visible={Boolean(deletingUser)}
        onCancel={() => setDeletingUser(undefined)}
        onConfirm={handleRemoveUser}
      />
    </Row>
  );
};
