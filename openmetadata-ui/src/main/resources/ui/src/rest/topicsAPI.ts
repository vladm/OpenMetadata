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

import { AxiosResponse } from 'axios';
import { Operation } from 'fast-json-patch';
import { PagingWithoutTotal, RestoreRequestType } from 'Models';
import { QueryVote } from '../components/TableQueries/TableQueries.interface';
import { TabSpecificField } from '../enums/entity.enum';
import { Topic } from '../generated/entity/data/topic';
import { EntityHistory } from '../generated/type/entityHistory';
import { EntityReference } from '../generated/type/entityReference';
import { Include } from '../generated/type/include';
import { Paging } from '../generated/type/paging';
import { ServicePageData } from '../pages/ServiceDetailsPage/ServiceDetailsPage';
import { getURLWithQueryFields } from '../utils/APIUtils';
import APIClient from './index';

const BASE_URL = '/topics';

export const getTopicVersions = async (id: string) => {
  const url = `${BASE_URL}/${id}/versions`;

  const response = await APIClient.get<EntityHistory>(url);

  return response.data;
};
export const getTopicVersion = async (id: string, version: string) => {
  const url = `${BASE_URL}/${id}/versions/${version}`;

  const response = await APIClient.get<Topic>(url);

  return response.data;
};

export const getTopics = async (
  service: string,
  fields: string,
  paging?: PagingWithoutTotal,
  include: Include = Include.NonDeleted
) => {
  const response = await APIClient.get<{
    data: ServicePageData[];
    paging: Paging;
  }>(`${BASE_URL}`, {
    params: {
      service,
      fields,
      ...paging,
      include,
    },
  });

  return response.data;
};

export const getTopicDetails = (
  id: string,
  arrQueryFields: string
): Promise<AxiosResponse> => {
  const url = getURLWithQueryFields(`${BASE_URL}/${id}`, arrQueryFields);

  return APIClient.get(url);
};

export const getTopicByFqn = async (
  fqn: string,
  arrQueryFields: string[] | string | TabSpecificField[]
) => {
  const url = getURLWithQueryFields(
    `${BASE_URL}/name/${fqn}`,
    arrQueryFields,
    'include=all'
  );

  const response = await APIClient.get<Topic>(url);

  return response.data;
};

export const addFollower = async (topicId: string, userId: string) => {
  const configOptions = {
    headers: { 'Content-type': 'application/json' },
  };

  const response = await APIClient.put<
    string,
    AxiosResponse<{
      changeDescription: { fieldsAdded: { newValue: EntityReference[] }[] };
    }>
  >(`${BASE_URL}/${topicId}/followers`, userId, configOptions);

  return response.data;
};

export const removeFollower = async (topicId: string, userId: string) => {
  const configOptions = {
    headers: { 'Content-type': 'application/json' },
  };

  const response = await APIClient.delete<
    string,
    AxiosResponse<{
      changeDescription: {
        fieldsDeleted: { oldValue: EntityReference[] }[];
      };
    }>
  >(`${BASE_URL}/${topicId}/followers/${userId}`, configOptions);

  return response.data;
};

export const patchTopicDetails = async (id: string, data: Operation[]) => {
  const configOptions = {
    headers: { 'Content-type': 'application/json-patch+json' },
  };

  const response = await APIClient.patch<Operation[], AxiosResponse<Topic>>(
    `${BASE_URL}/${id}`,
    data,
    configOptions
  );

  return response.data;
};

export const restoreTopic = async (id: string) => {
  const response = await APIClient.put<
    RestoreRequestType,
    AxiosResponse<Topic>
  >(`${BASE_URL}/restore`, { id });

  return response.data;
};

export const getSampleDataByTopicId = async (id: string) => {
  const response = await APIClient.get<Topic>(`${BASE_URL}/${id}/sampleData`);

  return response.data;
};

export const updateTopicVotes = async (id: string, data: QueryVote) => {
  const response = await APIClient.put<QueryVote, AxiosResponse<Topic>>(
    `${BASE_URL}/${id}/vote`,
    data
  );

  return response.data;
};
