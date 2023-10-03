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

import i18next from 'i18next';
import { ReactComponent as ClassificationIcon } from '../assets/svg/classification.svg';
import { ReactComponent as ExploreIcon } from '../assets/svg/globalsearch.svg';
import { ReactComponent as GlossaryIcon } from '../assets/svg/glossary.svg';
import { ReactComponent as DomainsIcon } from '../assets/svg/ic-domain.svg';
import { ReactComponent as QualityIcon } from '../assets/svg/ic-quality-v1.svg';
import { ReactComponent as SettingsIcon } from '../assets/svg/ic-settings-v1.svg';
import { ReactComponent as InsightsIcon } from '../assets/svg/lampcharge.svg';
import { ROUTES } from './constants';

export const SIDEBAR_LIST = [
  {
    key: ROUTES.EXPLORE,
    label: i18next.t('label.explore'),
    redirect_url: '/explore/tables',
    icon: ExploreIcon,
    dataTestId: 'app-bar-item-explore',
  },
  {
    key: ROUTES.DATA_QUALITY,
    label: i18next.t('label.quality'),
    redirect_url: ROUTES.DATA_QUALITY,
    icon: QualityIcon,
    dataTestId: 'app-bar-item-data-quality',
  },
  {
    key: ROUTES.DATA_INSIGHT,
    label: i18next.t('label.insight-plural'),
    redirect_url: ROUTES.DATA_INSIGHT,
    icon: InsightsIcon,
    dataTestId: 'app-bar-item-data-insight',
  },
  {
    key: ROUTES.DOMAIN,
    label: i18next.t('label.domain-plural'),
    redirect_url: ROUTES.DOMAIN,
    icon: DomainsIcon,
    dataTestId: 'app-bar-item-domain',
  },
];

export const SIDEBAR_GOVERN_LIST = [
  {
    key: 'glossary',
    label: i18next.t('label.glossary'),
    redirect_url: ROUTES.GLOSSARY,
    icon: GlossaryIcon,
    dataTestId: 'app-bar-item-glossary',
  },
  {
    key: 'tags',
    label: i18next.t('label.classification'),
    redirect_url: ROUTES.TAGS,
    icon: ClassificationIcon,
    dataTestId: 'app-bar-item-tags',
  },
];

export const SETTING_ITEM = {
  key: ROUTES.SETTINGS,
  label: i18next.t('label.setting-plural'),
  redirect_url: ROUTES.SETTINGS,
  icon: SettingsIcon,
  dataTestId: 'app-bar-item-settings',
};
