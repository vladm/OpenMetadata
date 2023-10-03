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
import {
  MOCKED_GLOSSARY_TERMS,
  MOCKED_GLOSSARY_TERMS_1,
  MOCKED_GLOSSARY_TERMS_TREE,
  MOCKED_GLOSSARY_TERMS_TREE_1,
} from '../mocks/Glossary.mock';
import {
  buildTree,
  formatRelatedTermOptions,
  getQueryFilterToExcludeTerm,
} from './GlossaryUtils';

describe('Glossary Utils', () => {
  it('getQueryFilterToExcludeTerm returns the correct query filter', () => {
    const fqn = 'example';
    const expectedQueryFilter = {
      query: {
        bool: {
          must: [
            {
              bool: {
                must: [
                  {
                    bool: {
                      must_not: {
                        term: {
                          'tags.tagFQN': fqn,
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    };

    const queryFilter = getQueryFilterToExcludeTerm(fqn);

    expect(queryFilter).toEqual(expectedQueryFilter);
  });

  it('should build the tree correctly', () => {
    expect(buildTree(MOCKED_GLOSSARY_TERMS)).toEqual(
      MOCKED_GLOSSARY_TERMS_TREE
    );
  });

  it('should build the tree correctly when the terms with empty children are received as initial items in array', () => {
    expect(buildTree(MOCKED_GLOSSARY_TERMS_1)).toEqual(
      MOCKED_GLOSSARY_TERMS_TREE_1
    );
  });

  it('formatRelatedTermOptions - should format related term options correctly', () => {
    const data = [
      { id: 'term1', displayName: 'Term One', type: 'glossaryTerm' },
      { id: 'term2', name: 'Term Two', type: 'glossaryTerm' },
    ];
    const expectedOutput = [
      {
        id: 'term1',
        value: 'term1',
        label: 'Term One',
        key: 'term1',
        displayName: 'Term One',
        type: 'glossaryTerm',
      },
      {
        id: 'term2',
        value: 'term2',
        label: 'Term Two',
        name: 'Term Two',
        key: 'term2',
        type: 'glossaryTerm',
      },
    ];

    expect(formatRelatedTermOptions(data)).toEqual(expectedOutput);
  });

  it('formatRelatedTermOptions -should return an empty array if no data is provided', () => {
    expect(formatRelatedTermOptions(undefined)).toEqual([]);
  });
});
