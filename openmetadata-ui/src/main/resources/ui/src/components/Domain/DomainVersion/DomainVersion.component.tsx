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
import { AxiosError } from 'axios';
import { noop, toString } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Domain } from '../../../generated/entity/domains/domain';
import { EntityHistory } from '../../../generated/type/entityHistory';
import {
  getDomainByName,
  getDomainVersionData,
  getDomainVersionsList,
} from '../../../rest/domainAPI';
import {
  getDomainPath,
  getDomainVersionsPath,
} from '../../../utils/RouterUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import PageLayoutV1 from '../../containers/PageLayoutV1';
import EntityVersionTimeLine from '../../Entity/EntityVersionTimeLine/EntityVersionTimeLine';
import DomainDetailsPage from '../DomainDetailsPage/DomainDetailsPage.component';

const DomainVersion = () => {
  const history = useHistory();
  const { fqn, version } = useParams<{ fqn: string; version: string }>();
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<Domain>();
  const [versionList, setVersionList] = useState<EntityHistory>(
    {} as EntityHistory
  );
  const [selectedData, setSelectedData] = useState<Domain>();

  const fetchVersionsInfo = useCallback(async () => {
    if (!domain) {
      return;
    }

    try {
      const res = await getDomainVersionsList(domain.id);
      setVersionList(res);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  }, [domain]);

  const fetchActiveVersion = useCallback(async () => {
    if (!domain) {
      return;
    }
    setLoading(true);
    try {
      const res = await getDomainVersionData(domain.id, version);
      setSelectedData(res);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setLoading(false);
    }
  }, [domain]);

  const fetchDomainData = useCallback(async () => {
    try {
      const res = await getDomainByName(fqn, '');
      setDomain(res);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  }, [fqn]);

  const onVersionChange = (selectedVersion: string) => {
    const path = getDomainVersionsPath(fqn, selectedVersion);
    history.push(path);
  };

  const onBackHandler = () => {
    const path = getDomainPath(selectedData?.fullyQualifiedName);
    history.push(path);
  };

  useEffect(() => {
    fetchDomainData();
  }, [fqn, version]);

  useEffect(() => {
    fetchVersionsInfo();
    fetchActiveVersion();
  }, [domain]);

  return (
    <PageLayoutV1 pageTitle="Domain version">
      <div className="version-data page-container p-0">
        {selectedData && (
          <DomainDetailsPage
            isVersionsView
            domain={selectedData}
            loading={loading}
            onDelete={noop}
            onUpdate={() => Promise.resolve()}
          />
        )}
      </div>
      <EntityVersionTimeLine
        currentVersion={toString(version)}
        versionHandler={onVersionChange}
        versionList={versionList}
        onBack={onBackHandler}
      />
    </PageLayoutV1>
  );
};

export default DomainVersion;
