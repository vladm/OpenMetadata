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
import { isEmpty } from 'lodash';
import { EntityTags } from 'Models';
import React from 'react';
import AsyncSelectList from '../../../components/AsyncSelectList/AsyncSelectList';
import { TagSource } from '../../../generated/entity/data/container';
import { TagLabel } from '../../../generated/type/tagLabel';
import { fetchTagsElasticSearch } from '../../../utils/TagsUtils';

export interface TagSuggestionProps {
  onChange?: (newTags: TagLabel[]) => void;
  value?: TagLabel[];
}

const TagSuggestion: React.FC<TagSuggestionProps> = ({ onChange, value }) => {
  const handleTagSelection = (newValue: string[]) => {
    let newTags: EntityTags = [];
    if (!isEmpty(newValue)) {
      newTags = newValue.map((t) => ({
        tagFQN: t,
        source: TagSource.Classification,
      }));
    }
    onChange && onChange(newTags);
  };

  return (
    <AsyncSelectList
      defaultValue={value?.map((item) => item.tagFQN) || []}
      fetchOptions={fetchTagsElasticSearch}
      mode="multiple"
      placeholder={t('label.select-field', {
        field: t('label.tag-plural'),
      })}
      onChange={(value) => handleTagSelection(value as string[])}
    />
  );
};

export default TagSuggestion;
