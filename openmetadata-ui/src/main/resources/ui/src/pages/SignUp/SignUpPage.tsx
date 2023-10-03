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

import { Button, Card, Form, FormProps, Input, Space, Typography } from 'antd';
import { AxiosError } from 'axios';
import { CookieStorage } from 'cookie-storage';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import appState from '../../AppState';
import { ReactComponent as OMDLogo } from '../../assets/svg/logo-monogram.svg';
import { useAuthContext } from '../../components/authentication/auth-provider/AuthProvider';
import { UserProfile } from '../../components/authentication/auth-provider/AuthProvider.interface';
import TeamsSelectable from '../../components/TeamsSelectable/TeamsSelectable';
import {
  REDIRECT_PATHNAME,
  ROUTES,
  VALIDATION_MESSAGES,
} from '../../constants/constants';
import { createUser } from '../../rest/userAPI';
import { getNameFromUserData } from '../../utils/AuthProvider.util';
import { getImages, Transi18next } from '../../utils/CommonUtils';
import { showErrorToast } from '../../utils/ToastUtils';

const cookieStorage = new CookieStorage();

const SignUp = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const {
    setIsSigningIn,
    jwtPrincipalClaims = [],
    authorizerConfig,
  } = useAuthContext();

  const [loading, setLoading] = useState<boolean>(false);

  const handleCreateNewUser: FormProps['onFinish'] = async (data) => {
    setLoading(true);

    try {
      const res = await createUser({
        ...data,
        profile: {
          images: getImages(appState.newUser.picture ?? ''),
        },
      });

      appState.updateUserDetails(res);
      cookieStorage.removeItem(REDIRECT_PATHNAME);
      setIsSigningIn(false);
      history.push(ROUTES.HOME);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.create-entity-error', {
          entity: t('label.user'),
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center w-full h-full">
      <Card className="p-x-md p-y-md w-500">
        <Space
          align="center"
          className="w-full m-b-lg"
          direction="vertical"
          size="middle">
          <OMDLogo
            data-testid="om-logo"
            height={50}
            name={t('label.open-metadata-logo')}
            width={50}
          />
          <Typography.Title
            className="text-center"
            data-testid="om-heading"
            level={3}>
            <Transi18next
              i18nKey="label.join-entity"
              renderElement={<span className="text-primary" />}
              values={{
                entity: t('label.open-metadata'),
              }}
            />
          </Typography.Title>
        </Space>

        <Form
          data-testid="create-user-form"
          initialValues={{
            displayName: appState.newUser.name || '',
            ...getNameFromUserData(
              appState.newUser as UserProfile,
              jwtPrincipalClaims,
              authorizerConfig?.principalDomain
            ),
          }}
          layout="vertical"
          validateMessages={VALIDATION_MESSAGES}
          onFinish={handleCreateNewUser}>
          <Form.Item
            data-testid="full-name-label"
            label={t('label.full-name')}
            name="displayName"
            rules={[
              {
                required: true,
              },
            ]}>
            <Input
              data-testid="full-name-input"
              placeholder={t('label.your-entity', {
                entity: t('label.full-name'),
              })}
            />
          </Form.Item>

          <Form.Item
            data-testid="username-label"
            label={t('label.username')}
            name="name"
            rules={[
              {
                required: true,
              },
            ]}>
            <Input
              disabled
              data-testid="username-input"
              placeholder={t('label.username')}
            />
          </Form.Item>

          <Form.Item
            data-testid="email-label"
            label={t('label.email')}
            name="email"
            rules={[
              {
                required: true,
              },
            ]}>
            <Input
              disabled
              data-testid="email-input"
              placeholder={t('label.your-entity', {
                entity: `${t('label.email')} ${t('label.address')}`,
              })}
              type="email"
            />
          </Form.Item>

          <Form.Item
            data-testid="select-team-label"
            label={t('label.select-field', {
              field: t('label.team-plural-lowercase'),
            })}
            name="teams"
            trigger="onSelectionChange">
            <TeamsSelectable filterJoinable showTeamsAlert />
          </Form.Item>

          <Space align="center" className="w-full justify-end d-flex">
            <Button
              data-testid="create-button"
              htmlType="submit"
              loading={loading}
              type="primary">
              {t('label.create')}
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default SignUp;
