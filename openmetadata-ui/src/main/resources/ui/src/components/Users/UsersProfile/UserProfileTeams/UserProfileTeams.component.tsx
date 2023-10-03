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

import { Card, Space, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as EditIcon } from '../../../../assets/svg/edit-new.svg';
import { ReactComponent as IconTeamsGrey } from '../../../../assets/svg/teams-grey.svg';
import Chip from '../../../../components/common/Chip/Chip.component';
import InlineEdit from '../../../../components/InlineEdit/InlineEdit.component';
import TeamsSelectable from '../../../../components/TeamsSelectable/TeamsSelectable';
import {
  DE_ACTIVE_COLOR,
  ICON_DIMENSION,
} from '../../../../constants/constants';
import { useAuth } from '../../../../hooks/authHooks';
import { getNonDeletedTeams } from '../../../../utils/CommonUtils';
import { UserProfileTeamsProps } from './UserProfileTeams.interface';

const UserProfileTeams = ({
  teams,
  updateUserDetails,
}: UserProfileTeamsProps) => {
  const { t } = useTranslation();
  const { isAdminUser } = useAuth();

  const [isTeamsEdit, setIsTeamsEdit] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const handleTeamsSave = () => {
    updateUserDetails({
      teams: selectedTeams.map((teamId) => ({ id: teamId, type: 'team' })),
    });

    setIsTeamsEdit(false);
  };

  const teamsRenderElement = useMemo(
    () => (
      <Chip
        data={getNonDeletedTeams(teams ?? [])}
        icon={<IconTeamsGrey height={20} width={20} />}
        noDataPlaceholder={t('message.no-team-found')}
      />
    ),
    [teams, getNonDeletedTeams]
  );

  useEffect(() => {
    setSelectedTeams(getNonDeletedTeams(teams ?? []).map((team) => team.id));
  }, [teams]);

  return (
    <Card
      className="relative card-body-border-none card-padding-y-0"
      key="teams-card"
      title={
        <Space align="center">
          <Typography.Text className="right-panel-label">
            {t('label.team-plural')}
          </Typography.Text>

          {!isTeamsEdit && isAdminUser && (
            <EditIcon
              className="cursor-pointer"
              color={DE_ACTIVE_COLOR}
              data-testid="edit-teams"
              {...ICON_DIMENSION}
              onClick={() => setIsTeamsEdit(true)}
            />
          )}
        </Space>
      }>
      <div className="m-b-md">
        {isTeamsEdit && isAdminUser ? (
          <InlineEdit
            direction="vertical"
            onCancel={() => setIsTeamsEdit(false)}
            onSave={handleTeamsSave}>
            <TeamsSelectable
              filterJoinable
              maxValueCount={4}
              selectedTeams={selectedTeams}
              onSelectionChange={setSelectedTeams}
            />
          </InlineEdit>
        ) : (
          teamsRenderElement
        )}
      </div>
    </Card>
  );
};

export default UserProfileTeams;
