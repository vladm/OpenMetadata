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
import { Button, List, Modal, Select, Space } from 'antd';
import { compare } from 'fast-json-patch';
import { map, startCase } from 'lodash';
import { EntityDetailUnion } from 'Models';
import VirtualList from 'rc-virtual-list';
import {
  default as React,
  UIEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { PAGE_SIZE_MEDIUM } from '../../../constants/constants';
import { SearchIndex } from '../../../enums/search.enum';
import { Table } from '../../../generated/entity/data/table';
import { DataProduct } from '../../../generated/entity/domains/dataProduct';
import { Domain } from '../../../generated/entity/domains/domain';
import { getDataProductByName } from '../../../rest/dataProductAPI';
import { getDomainByName } from '../../../rest/domainAPI';
import { searchQuery } from '../../../rest/searchAPI';
import {
  getAPIfromSource,
  getAssetsFields,
  getAssetsSearchIndex,
  getEntityAPIfromSource,
} from '../../../utils/Assets/AssetsUtils';
import { getQueryFilterToExcludeTerm } from '../../../utils/GlossaryUtils';
import Searchbar from '../../common/searchbar/Searchbar';
import TableDataCardV2 from '../../common/table-data-card-v2/TableDataCardV2';
import { AssetsOfEntity } from '../../Glossary/GlossaryTerms/tabs/AssetsTabs.interface';
import Loader from '../../Loader/Loader';
import { SearchedDataProps } from '../../searched-data/SearchedData.interface';
import './asset-selection-model.style.less';
import { AssetSelectionModalProps } from './AssetSelectionModal.interface';

export const AssetSelectionModal = ({
  entityFqn,
  onCancel,
  onSave,
  open,
  type = AssetsOfEntity.GLOSSARY,
}: AssetSelectionModalProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<SearchedDataProps['data']>([]);
  const [selectedItems, setSelectedItems] =
    useState<Map<string, EntityDetailUnion>>();
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SearchIndex>(
    SearchIndex.TABLE
  );
  const [activeEntity, setActiveEntity] = useState<Domain | DataProduct>();
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const queryFilter = useMemo(() => {
    if (type === AssetsOfEntity.GLOSSARY) {
      return getQueryFilterToExcludeTerm(entityFqn);
    } else {
      return {};
    }
  }, [entityFqn, type]);

  const fetchEntities = useCallback(
    async ({ searchText = '', page = 1, index = activeFilter }) => {
      try {
        setIsLoading(true);
        const res = await searchQuery({
          pageNumber: page,
          pageSize: PAGE_SIZE_MEDIUM,
          searchIndex: index,
          query: searchText,
          queryFilter: queryFilter,
        });
        const hits = res.hits.hits as SearchedDataProps['data'];
        setTotalCount(res.hits.total.value ?? 0);
        setItems(page === 1 ? hits : (prevItems) => [...prevItems, ...hits]);
        setPageNumber(page);
      } catch (_) {
        // Nothing here
      } finally {
        setIsLoading(false);
      }
    },
    [setActiveFilter]
  );

  const fetchCurrentEntity = useCallback(async () => {
    if (type === AssetsOfEntity.DOMAIN) {
      const data = await getDomainByName(encodeURIComponent(entityFqn), '');
      setActiveEntity(data);
    } else if (type === AssetsOfEntity.DATA_PRODUCT) {
      const data = await getDataProductByName(
        encodeURIComponent(entityFqn),
        ''
      );
      setActiveEntity(data);
    }
  }, [type, entityFqn]);

  useEffect(() => {
    if (open) {
      fetchEntities({ index: activeFilter, searchText: search });
      fetchCurrentEntity();
    }
  }, [open, activeFilter, search, type]);

  const handleCardClick = (
    details: SearchedDataProps['data'][number]['_source']
  ) => {
    const id = details.id;
    if (!id) {
      return;
    }
    if (selectedItems?.has(id ?? '')) {
      setSelectedItems((prevItems) => {
        const selectedItemMap = new Map();

        prevItems?.forEach(
          (item) => item.id !== id && selectedItemMap.set(item.id, item)
        );

        return selectedItemMap;
      });
    } else {
      setSelectedItems((prevItems) => {
        const selectedItemMap = new Map();

        prevItems?.forEach((item) => selectedItemMap.set(item.id, item));

        selectedItemMap.set(
          id,
          items.find(({ _source }) => _source.id === id)?._source
        );

        return selectedItemMap;
      });
    }
  };

  const getJsonPatchObject = (entity: Table) => {
    if (!activeEntity) {
      return [];
    }
    const { id, description, fullyQualifiedName, name, displayName } =
      activeEntity;
    const patchObj = {
      id,
      description,
      fullyQualifiedName,
      name,
      displayName,
      type: type === AssetsOfEntity.DATA_PRODUCT ? 'dataProduct' : 'domain',
    };

    if (type === AssetsOfEntity.DATA_PRODUCT) {
      const jsonPatch = compare(entity, {
        ...entity,
        dataProducts: [...(entity.dataProducts ?? []), patchObj],
      });

      return jsonPatch;
    } else {
      const jsonPatch = compare(entity, {
        ...entity,
        domain: patchObj,
      });

      return jsonPatch;
    }
  };

  const domainAndDataProductsSave = async () => {
    setIsLoading(true);
    const entityDetails = [...(selectedItems?.values() ?? [])].map((item) =>
      getEntityAPIfromSource(item.entityType)(
        item.fullyQualifiedName,
        getAssetsFields(type)
      )
    );

    try {
      const entityDetailsResponse = await Promise.allSettled(entityDetails);
      const map = new Map();

      entityDetailsResponse.forEach((response) => {
        if (response.status === 'fulfilled') {
          const entity = response.value;
          entity && map.set(entity.fullyQualifiedName, entity);
        }
      });
      const patchAPIPromises = [...(selectedItems?.values() ?? [])]
        .map((item) => {
          if (map.has(item.fullyQualifiedName) && activeEntity) {
            const entity = map.get(item.fullyQualifiedName);
            const jsonPatch = getJsonPatchObject(entity);
            const api = getAPIfromSource(item.entityType);

            return api(item.id, jsonPatch);
          }

          return;
        })
        .filter(Boolean);

      await Promise.all(patchAPIPromises);
      onSave?.();
      onCancel();
    } catch (_) {
      // Nothing here
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    const entityDetails = [...(selectedItems?.values() ?? [])].map((item) =>
      getEntityAPIfromSource(item.entityType)(
        item.fullyQualifiedName,
        getAssetsFields(type)
      )
    );

    try {
      const entityDetailsResponse = await Promise.allSettled(entityDetails);
      const map = new Map();

      entityDetailsResponse.forEach((response) => {
        if (response.status === 'fulfilled') {
          const entity = response.value;
          entity && map.set(entity.fullyQualifiedName, entity.tags);
        }
      });
      const patchAPIPromises = [...(selectedItems?.values() ?? [])]
        .map((item) => {
          if (map.has(item.fullyQualifiedName)) {
            const jsonPatch = compare(
              { tags: map.get(item.fullyQualifiedName) },
              {
                tags: [
                  ...(item.tags ?? []),
                  {
                    tagFQN: entityFqn,
                    source: 'Glossary',
                    labelType: 'Manual',
                  },
                ],
              }
            );
            const api = getAPIfromSource(item.entityType);

            return api(item.id, jsonPatch);
          }

          return;
        })
        .filter(Boolean);

      await Promise.all(patchAPIPromises);
      onSave?.();
      onCancel();
    } catch (_) {
      // Nothing here
    } finally {
      setIsLoading(false);
    }
  };

  const onSaveAction = () => {
    if (type === AssetsOfEntity.GLOSSARY) {
      handleSave();
    } else {
      domainAndDataProductsSave();
    }
  };

  const onScroll: UIEventHandler<HTMLElement> = useCallback(
    (e) => {
      if (
        e.currentTarget.scrollHeight - e.currentTarget.scrollTop === 500 &&
        items.length < totalCount
      ) {
        !isLoading &&
          fetchEntities({
            searchText: search,
            page: pageNumber + 1,
            index: activeFilter,
          });
      }
    },
    [activeFilter, search, totalCount, items]
  );

  const mapAssetsSearchIndex = useMemo(() => {
    return getAssetsSearchIndex(type);
  }, [type]);

  return (
    <Modal
      destroyOnClose
      closable={false}
      closeIcon={null}
      footer={
        <>
          <Button onClick={onCancel}>{t('label.cancel')}</Button>
          <Button loading={isLoading} type="primary" onClick={onSaveAction}>
            {t('label.save')}
          </Button>
        </>
      }
      open={open}
      style={{ top: 40 }}
      title={t('label.add-entity', { entity: t('label.asset-plural') })}
      width={750}
      onCancel={onCancel}>
      <Space className="w-full h-full" direction="vertical" size={16}>
        <Searchbar
          removeMargin
          showClearSearch
          showLoadingStatus
          inputProps={{
            addonBefore: (
              <Select
                bordered={false}
                options={map(mapAssetsSearchIndex, (value, key) => ({
                  label: startCase(key),
                  value: value,
                }))}
                style={{ minWidth: '100px' }}
                value={activeFilter}
                onChange={setActiveFilter}
              />
            ),
          }}
          placeholder={t('label.search-entity', {
            entity: t('label.asset-plural'),
          })}
          searchValue={search}
          onSearch={setSearch}
        />
        <List loading={{ spinning: isLoading, indicator: <Loader /> }}>
          <VirtualList
            data={items}
            height={500}
            itemKey="id"
            onScroll={onScroll}>
            {({ _source: item }) => (
              <TableDataCardV2
                openEntityInNewPage
                showCheckboxes
                checked={selectedItems?.has(item.id ?? '')}
                className="m-b-sm asset-selection-model-card cursor-pointer"
                handleSummaryPanelDisplay={handleCardClick}
                id={`tabledatacard-${item.id}`}
                key={item.id}
                source={{ ...item, tags: [] }}
              />
            )}
          </VirtualList>
        </List>
      </Space>
    </Modal>
  );
};
