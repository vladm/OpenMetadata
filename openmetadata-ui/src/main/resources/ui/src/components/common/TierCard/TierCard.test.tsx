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

import {
  findByTestId,
  getByTestId,
  getByText,
  render,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import TierCard from './TierCard';

const mockTierData = [
  {
    id: 'e4ec1760-79c0-4afc-a0eb-c3da339aa750',
    name: 'Tier1',
    fullyQualifiedName: 'Tier.Tier1',
    description:
      '**Critical Source of Truth business data assets of an organization**',
    version: 0.1,
    updatedAt: 1665646906357,
    updatedBy: 'admin',
    href: 'http://localhost:8585/api/v1/tags/Tier/Tier1',
    deprecated: false,
    deleted: false,
  },
];

const mockGetTags = jest
  .fn()
  .mockImplementation(() => Promise.resolve({ data: mockTierData }));
const mockOnUpdate = jest.fn();
const mockShowErrorToast = jest.fn();
const mockProps = {
  currentTier: 'currentTier',
  updateTier: mockOnUpdate,
  children: <div>Child</div>,
};

jest.mock('../../../rest/tagAPI', () => ({
  getTags: jest.fn().mockImplementation(() => mockGetTags()),
}));

jest.mock('../../Loader/Loader', () => {
  return jest.fn().mockReturnValue(<div>Loader</div>);
});

jest.mock('../../../utils/ToastUtils', () => {
  return jest.fn().mockImplementation(() => mockShowErrorToast());
});

// Mock Antd components
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),

  Popover: jest
    .fn()
    .mockImplementation(({ content, onOpenChange, children }) => {
      onOpenChange(true);

      return (
        <>
          {content}
          {children}
        </>
      );
    }),
}));

jest.mock('../rich-text-editor/RichTextEditorPreviewer', () => {
  return jest.fn().mockReturnValue(<div>RichTextEditorPreviewer</div>);
});

describe('Test TierCard Component', () => {
  it('Component should have card', async () => {
    const { container } = render(<TierCard {...mockProps} />);

    await expect(getByText(container, 'Loader')).toBeInTheDocument();

    expect(mockGetTags).toHaveBeenCalled();

    expect(await findByTestId(container, 'cards')).toBeInTheDocument();
  });

  it('should call the mockOnUpdate when click on radio button', async () => {
    const { container } = render(<TierCard {...mockProps} />);

    await waitForElementToBeRemoved(() => getByText(container, 'Loader'));

    const radioButton = getByTestId(container, 'radio-btn-Tier1');

    expect(radioButton).toBeInTheDocument();

    userEvent.click(radioButton);

    expect(mockOnUpdate).toHaveBeenCalled();
  });

  it('should call the mockOnUpdate when click on Clear button', async () => {
    const { container } = render(<TierCard {...mockProps} />);

    await waitForElementToBeRemoved(() => getByText(container, 'Loader'));

    const clearTier = getByTestId(container, 'clear-tier');

    expect(clearTier).toBeInTheDocument();

    userEvent.click(clearTier);

    expect(mockOnUpdate).toHaveBeenCalled();
  });
});
