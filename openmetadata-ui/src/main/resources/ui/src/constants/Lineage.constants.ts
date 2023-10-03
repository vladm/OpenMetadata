/*
 *  Copyright 2022 Collate.
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

import { t } from 'i18next';
import { ElementLoadingState } from '../components/Entity/EntityLineage/EntityLineage.interface';
import { EntityType } from '../enums/entity.enum';

export const FOREIGN_OBJECT_SIZE = 40;
export const ZOOM_VALUE = 0.75;
export const MIN_ZOOM_VALUE = 0.1;
export const MAX_ZOOM_VALUE = 2.5;
export const ZOOM_SLIDER_STEP = 0.1;
export const ZOOM_BUTTON_STEP = 0.25;
export const ZOOM_TRANSITION_DURATION = 800;

export const PIPELINE_EDGE_WIDTH = 200;

export const entityData = [
  {
    type: EntityType.TABLE,
    label: t('label.table-plural'),
  },
  {
    type: EntityType.DASHBOARD,
    label: t('label.dashboard-plural'),
  },
  {
    type: EntityType.TOPIC,
    label: t('label.topic-plural'),
  },
  {
    type: EntityType.MLMODEL,
    label: t('label.ml-model-plural'),
  },
  {
    type: EntityType.CONTAINER,
    label: t('label.container-plural'),
  },
  {
    type: EntityType.PIPELINE,
    label: t('label.pipeline-plural'),
  },
  {
    type: EntityType.SEARCH_INDEX,
    label: t('label.search-index-plural'),
  },
  {
    type: EntityType.DASHBOARD_DATA_MODEL,
    label: t('label.data-model-plural'),
  },
];

export const POSITION_X = 150;
export const POSITION_Y = 60;

export const NODE_WIDTH = 400;
export const NODE_HEIGHT = 90;
export const EXPANDED_NODE_HEIGHT = 350;

export const ELEMENT_DELETE_STATE = {
  loading: false,
  status: 'initial' as ElementLoadingState,
};
