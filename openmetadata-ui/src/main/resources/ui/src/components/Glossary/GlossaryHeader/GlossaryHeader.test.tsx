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
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Glossary } from '../../../generated/entity/data/glossary';
import { DEFAULT_ENTITY_PERMISSION } from '../../../utils/PermissionsUtils';
import GlossaryHeader from './GlossaryHeader.component';

jest.mock(
  '../../common/UserTeamSelectableList/UserTeamSelectableList.component',
  () => {
    return {
      UserTeamSelectableList: jest.fn().mockImplementation(({ onUpdate }) => (
        <div>
          <p>UserTeamSelectableList</p>
          <button data-testid="update" onClick={onUpdate}>
            update
          </button>
        </div>
      )),
    };
  }
);

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
  useParams: jest.fn().mockReturnValue({
    glossaryFqn: 'glossaryFqn',
    action: 'action',
  }),
}));

jest.mock('../../common/description/DescriptionV1', () => {
  return jest.fn().mockImplementation(() => <div>Description</div>);
});

jest.mock('../../Entity/EntityHeader/EntityHeader.component', () => ({
  EntityHeader: jest
    .fn()
    .mockReturnValue(<div data-testid="entity-header">EntityHeader</div>),
}));

const mockOnUpdate = jest.fn();
const mockOnDelete = jest.fn();
const mockOnUpdateVote = jest.fn();

describe('GlossaryHeader component', () => {
  it('should render name of Glossary', () => {
    render(
      <GlossaryHeader
        isGlossary
        permissions={DEFAULT_ENTITY_PERMISSION}
        selectedData={{ displayName: 'glossaryTest' } as Glossary}
        updateVote={mockOnUpdateVote}
        onAddGlossaryTerm={mockOnDelete}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('EntityHeader')).toBeInTheDocument();
  });
});
