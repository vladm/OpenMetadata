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

import React, { FC, ReactNode, useContext, useState } from 'react';
import { ExploreSearchIndex } from '../../components/Explore/explore.interface';
import { GlobalSearchContextType } from './GlobalSearchProvider.interface';

export const GlobalSearchContext = React.createContext(
  {} as GlobalSearchContextType
);

interface Props {
  children: ReactNode;
}

const GlobalSearchProvider: FC<Props> = ({ children }: Props) => {
  const [searchCriteria, setSearchCriteria] = useState<ExploreSearchIndex | ''>(
    ''
  );

  const updateSearchCriteria = (criteria: ExploreSearchIndex | '') => {
    setSearchCriteria(criteria);
  };

  return (
    <GlobalSearchContext.Provider
      value={{
        searchCriteria,
        updateSearchCriteria,
      }}>
      {children}
    </GlobalSearchContext.Provider>
  );
};

export const useGlobalSearchProvider = () => useContext(GlobalSearchContext);

export default GlobalSearchProvider;
