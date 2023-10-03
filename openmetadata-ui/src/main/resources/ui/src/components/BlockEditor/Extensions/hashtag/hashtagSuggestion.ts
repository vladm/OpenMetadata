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
import { ReactRenderer } from '@tiptap/react';
import { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import tippy, { Instance, Props } from 'tippy.js';
import { EntityType } from '../../../../enums/entity.enum';
import { SearchIndex } from '../../../../enums/search.enum';
import { getSuggestions, searchData } from '../../../../rest/miscAPI';
import { getEntityBreadcrumbs } from '../../../../utils/EntityUtils';
import { buildMentionLink } from '../../../../utils/FeedUtils';
import { getEncodedFqn } from '../../../../utils/StringsUtils';
import { SearchedDataProps } from '../../../searched-data/SearchedData.interface';
import { ExtensionRef } from '../BlockEditor.interface';
import HashList from './HashList';

export const hashtagSuggestion = () => ({
  items: async ({ query }: { query: string }) => {
    if (!query) {
      const data = await searchData('*', 1, 5, '', '', '', SearchIndex.TABLE);
      const hits = data.data.hits.hits;

      return hits.map((hit) => ({
        id: hit._id,
        name: hit._source.name,
        label: hit._source.displayName,
        fqn: hit._source.fullyQualifiedName,
        href: buildMentionLink(
          hit._source.entityType,
          getEncodedFqn(hit._source.fullyQualifiedName ?? '')
        ),
        type: hit._source.entityType,
        breadcrumbs: getEntityBreadcrumbs(
          hit._source,
          hit._source.entityType as EntityType,
          false
        ),
      }));
    } else {
      const data = await getSuggestions(query);
      const hits = data.data.suggest['metadata-suggest'][0]['options'];

      return hits.map((hit) => ({
        id: hit._id,
        name: hit._source.name,
        label: hit._source.displayName,
        fqn: hit._source.fullyQualifiedName,
        href: buildMentionLink(
          hit._source.entityType,
          getEncodedFqn(hit._source.fullyQualifiedName ?? '')
        ),
        type: hit._source.entityType,
        breadcrumbs: getEntityBreadcrumbs(
          hit._source as SearchedDataProps['data'][number]['_source'],
          hit._source.entityType as EntityType,
          false
        ),
      }));
    }
  },

  render: () => {
    let component: ReactRenderer;
    let popup: Instance<Props>[];

    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(HashList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect:
            props.clientRect as Props['getReferenceClientRect'],
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: SuggestionProps) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect:
            props.clientRect as Props['getReferenceClientRect'],
        });
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === 'Escape' && !popup[0].state.isDestroyed) {
          popup[0].hide();

          return true;
        }

        return (component.ref as ExtensionRef)?.onKeyDown(props);
      },

      onExit() {
        if (!popup[0].state.isDestroyed) {
          popup[0].destroy();
        }
      },
    };
  },
});
