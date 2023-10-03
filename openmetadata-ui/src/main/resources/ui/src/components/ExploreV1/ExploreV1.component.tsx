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
  SortAscendingOutlined,
  SortDescendingOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  Layout,
  Menu,
  Row,
  Space,
  Switch,
  Typography,
} from 'antd';
import { Content } from 'antd/lib/layout/layout';
import Sider from 'antd/lib/layout/Sider';
import { isEmpty, isNil, isString, isUndefined, lowerCase, noop } from 'lodash';
import Qs from 'qs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
import { useAdvanceSearch } from '../../components/Explore/AdvanceSearchProvider/AdvanceSearchProvider.component';
import AppliedFilterText from '../../components/Explore/AppliedFilterText/AppliedFilterText';
import EntitySummaryPanel from '../../components/Explore/EntitySummaryPanel/EntitySummaryPanel.component';
import {
  ExploreProps,
  ExploreQuickFilterField,
  ExploreSearchIndex,
} from '../../components/Explore/explore.interface';
import { getSelectedValuesFromQuickFilter } from '../../components/Explore/Explore.utils';
import ExploreQuickFilters from '../../components/Explore/ExploreQuickFilters';
import SortingDropDown from '../../components/Explore/SortingDropDown';
import { useGlobalSearchProvider } from '../../components/GlobalSearchProvider/GlobalSearchProvider';
import SearchedData from '../../components/searched-data/SearchedData';
import { SearchedDataProps } from '../../components/searched-data/SearchedData.interface';
import { tabsInfo } from '../../constants/explore.constants';
import { ERROR_PLACEHOLDER_TYPE, SORT_ORDER } from '../../enums/common.enum';
import { SearchIndex } from '../../enums/search.enum';
import {
  QueryFieldInterface,
  QueryFieldValueInterface,
} from '../../pages/explore/ExplorePage.interface';
import { getDropDownItems } from '../../utils/AdvancedSearchUtils';
import { getCountBadge } from '../../utils/CommonUtils';
import { getSearchIndexFromPath } from '../../utils/ExplorePage/ExplorePageUtils';
import PageLayoutV1 from '../containers/PageLayoutV1';
import Loader from '../Loader/Loader';
import './ExploreV1.style.less';

const ExploreV1: React.FC<ExploreProps> = ({
  aggregations,
  searchResults,
  tabCounts,
  onChangeAdvancedSearchQuickFilters,
  searchIndex,
  onChangeSearchIndex,
  sortOrder,
  onChangeSortOder,
  sortValue,
  onChangeSortValue,
  onChangeShowDeleted,
  showDeleted,
  onChangePage = noop,
  loading,
  quickFilters,
}) => {
  const { t } = useTranslation();
  const { tab } = useParams<{ tab: string }>();
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<
    ExploreQuickFilterField[]
  >([] as ExploreQuickFilterField[]);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [entityDetails, setEntityDetails] =
    useState<SearchedDataProps['data'][number]['_source']>();

  const { searchCriteria } = useGlobalSearchProvider();

  const parsedSearch = useMemo(
    () =>
      Qs.parse(
        location.search.startsWith('?')
          ? location.search.substring(1)
          : location.search
      ),
    [location.search]
  );

  const searchQueryParam = useMemo(
    () => (isString(parsedSearch.search) ? parsedSearch.search : ''),
    [location.search]
  );

  const { toggleModal, sqlQuery, onResetAllFilters } = useAdvanceSearch();

  const handleClosePanel = () => {
    setShowSummaryPanel(false);
  };

  const isAscSortOrder = useMemo(
    () => sortOrder === SORT_ORDER.ASC,
    [sortOrder]
  );
  const sortProps = useMemo(
    () => ({
      className: 'text-base text-grey-muted',
      'data-testid': 'last-updated',
    }),
    []
  );

  const tabItems = useMemo(() => {
    const items = Object.entries(tabsInfo).map(
      ([tabSearchIndex, tabDetail]) => ({
        key: tabSearchIndex,
        label: (
          <div data-testid={`${lowerCase(tabDetail.label)}-tab`}>
            <Space className="w-full justify-between">
              <Typography.Text
                className={
                  tabSearchIndex === searchIndex ? 'text-primary' : ''
                }>
                {tabDetail.label}
              </Typography.Text>
              <span>
                {!isNil(tabCounts)
                  ? getCountBadge(
                      tabCounts[tabSearchIndex as ExploreSearchIndex],
                      '',
                      tabSearchIndex === searchIndex
                    )
                  : getCountBadge()}
              </span>
            </Space>
          </div>
        ),
        count: tabCounts ? tabCounts[tabSearchIndex as ExploreSearchIndex] : 0,
      })
    );

    return searchQueryParam
      ? items.filter((tabItem) => {
          return tabItem.count > 0 || tabItem.key === searchCriteria;
        })
      : items;
  }, [tabsInfo, tabCounts]);

  const activeTabKey = useMemo(() => {
    if (tab) {
      return searchIndex;
    } else if (tabItems.length > 0) {
      return tabItems[0].key as ExploreSearchIndex;
    }

    return searchIndex;
  }, [tab, searchIndex, tabItems]);

  // get entity active tab by URL params
  const defaultActiveTab = useMemo(() => {
    if (tab) {
      return getSearchIndexFromPath(tab) ?? SearchIndex.TABLE;
    } else if (tabItems.length > 0) {
      return tabItems[0].key;
    }

    return SearchIndex.TABLE;
  }, [tab, tabItems]);

  const handleSummaryPanelDisplay = useCallback(
    (details: SearchedDataProps['data'][number]['_source']) => {
      setShowSummaryPanel(true);
      setEntityDetails(details);
    },
    []
  );

  const clearFilters = () => {
    // onChangeAdvancedSearchQuickFilters(undefined);
    onResetAllFilters();
  };

  const handleQuickFiltersChange = (data: ExploreQuickFilterField[]) => {
    const must = [] as Array<QueryFieldInterface>;

    // Mapping the selected advanced search quick filter dropdown values
    // to form a queryFilter to pass as a search parameter
    data.forEach((filter) => {
      if (!isEmpty(filter.value)) {
        const should = [] as Array<QueryFieldValueInterface>;
        if (filter.value) {
          filter.value.forEach((filterValue) => {
            const term = {} as QueryFieldValueInterface['term'];

            term[filter.key] = filterValue.key;

            should.push({ term });
          });
        }

        must.push({ bool: { should } });
      }
    });

    onChangeAdvancedSearchQuickFilters(
      isEmpty(must)
        ? undefined
        : {
            query: { bool: { must } },
          }
    );
  };

  const handleQuickFiltersValueSelect = (field: ExploreQuickFilterField) => {
    setSelectedQuickFilters((pre) => {
      const data = pre.map((preField) => {
        if (preField.key === field.key) {
          return field;
        } else {
          return preField;
        }
      });

      handleQuickFiltersChange(data);

      return data;
    });
  };

  useEffect(() => {
    const escapeKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClosePanel();
      }
    };
    document.addEventListener('keydown', escapeKeyHandler);

    return () => {
      document.removeEventListener('keydown', escapeKeyHandler);
    };
  }, []);

  useEffect(() => {
    const dropdownItems = getDropDownItems(activeTabKey);

    setSelectedQuickFilters(
      dropdownItems.map((item) => ({
        ...item,
        value: getSelectedValuesFromQuickFilter(
          item,
          dropdownItems,
          quickFilters
        ),
      }))
    );
  }, [activeTabKey, quickFilters]);

  useEffect(() => {
    if (
      !isUndefined(searchResults) &&
      searchResults?.hits?.hits[0] &&
      searchResults?.hits?.hits[0]._index === searchIndex
    ) {
      handleSummaryPanelDisplay(searchResults?.hits?.hits[0]._source);
    } else {
      setShowSummaryPanel(false);
      setEntityDetails(undefined);
    }
  }, [tab, searchResults]);

  if (tabItems.length === 0 && !searchQueryParam) {
    return <Loader />;
  }

  return (
    <div className="explore-page bg-white" data-testid="explore-page">
      <div className="w-full h-full">
        {tabItems.length > 0 && (
          <Layout hasSider className="bg-white">
            <Sider className="bg-white border-right" width={250}>
              <Typography.Paragraph className="explore-data-header">
                {t('label.data-asset-plural')}
              </Typography.Paragraph>
              <Menu
                className="custom-menu"
                data-testid="explore-left-panel"
                items={tabItems}
                mode="inline"
                rootClassName="left-container"
                selectedKeys={[defaultActiveTab]}
                onClick={(info) => {
                  info && onChangeSearchIndex(info.key as ExploreSearchIndex);
                  setShowSummaryPanel(false);
                }}
              />
            </Sider>
            <Content>
              <Row className="filters-row">
                <Col className="searched-data-container w-full">
                  <Row gutter={[0, 8]}>
                    <Col>
                      <ExploreQuickFilters
                        aggregations={aggregations}
                        fields={selectedQuickFilters}
                        index={activeTabKey}
                        showDeleted={showDeleted}
                        onAdvanceSearch={() => toggleModal(true)}
                        onChangeShowDeleted={onChangeShowDeleted}
                        onFieldValueSelect={handleQuickFiltersValueSelect}
                      />
                    </Col>
                    <Col
                      className="d-flex items-center justify-end gap-4"
                      flex={410}>
                      <span className="flex-center">
                        <Switch
                          checked={showDeleted}
                          data-testid="show-deleted"
                          onChange={onChangeShowDeleted}
                        />
                        <Typography.Text className="p-l-xs text-grey-muted">
                          {t('label.deleted')}
                        </Typography.Text>
                      </span>
                      {(quickFilters || sqlQuery) && (
                        <Typography.Text
                          className="text-primary self-center cursor-pointer"
                          onClick={() => clearFilters()}>
                          {t('label.clear-entity', {
                            entity: '',
                          })}
                        </Typography.Text>
                      )}

                      <Typography.Text
                        className="text-primary self-center cursor-pointer"
                        data-testid="advance-search-button"
                        onClick={() => toggleModal(true)}>
                        {t('label.advanced-entity', {
                          entity: '',
                        })}
                      </Typography.Text>
                      <span className="sorting-dropdown-container">
                        <SortingDropDown
                          fieldList={tabsInfo[searchIndex].sortingFields}
                          handleFieldDropDown={onChangeSortValue}
                          sortField={sortValue}
                        />
                        <Button
                          className="p-0"
                          data-testid="sort-order-button"
                          size="small"
                          type="text"
                          onClick={() =>
                            onChangeSortOder(
                              isAscSortOrder ? SORT_ORDER.DESC : SORT_ORDER.ASC
                            )
                          }>
                          {isAscSortOrder ? (
                            <SortAscendingOutlined
                              style={{ fontSize: '14px' }}
                              {...sortProps}
                            />
                          ) : (
                            <SortDescendingOutlined
                              style={{ fontSize: '14px' }}
                              {...sortProps}
                            />
                          )}
                        </Button>
                      </span>
                    </Col>
                    {sqlQuery && (
                      <Col span={24}>
                        <AppliedFilterText
                          filterText={sqlQuery}
                          onEdit={() => toggleModal(true)}
                        />
                      </Col>
                    )}
                  </Row>
                </Col>
              </Row>
              <PageLayoutV1
                className="p-0 explore-page-layout"
                pageTitle={t('label.explore')}
                rightPanel={
                  showSummaryPanel &&
                  entityDetails &&
                  !loading && (
                    <EntitySummaryPanel
                      entityDetails={{ details: entityDetails }}
                      handleClosePanel={handleClosePanel}
                    />
                  )
                }
                rightPanelWidth={400}>
                <Row className="p-t-xs">
                  <Col
                    lg={{ offset: 2, span: 19 }}
                    md={{ offset: 0, span: 24 }}>
                    {!loading ? (
                      <SearchedData
                        isFilterSelected
                        data={searchResults?.hits.hits ?? []}
                        filter={parsedSearch}
                        handleSummaryPanelDisplay={handleSummaryPanelDisplay}
                        isSummaryPanelVisible={showSummaryPanel}
                        selectedEntityId={entityDetails?.id || ''}
                        totalValue={
                          tabCounts?.[searchIndex] ??
                          searchResults?.hits.total.value ??
                          0
                        }
                        onPaginationChange={onChangePage}
                      />
                    ) : (
                      <Loader />
                    )}
                  </Col>
                </Row>
              </PageLayoutV1>
            </Content>
          </Layout>
        )}
      </div>

      {searchQueryParam && tabItems.length === 0 && !loading && (
        <Space
          align="center"
          className="w-full flex-center full-height"
          data-testid="no-search-results"
          direction="vertical"
          size={48}>
          <ErrorPlaceHolder
            className="mt-0-important"
            type={ERROR_PLACEHOLDER_TYPE.FILTER}
          />
        </Space>
      )}
      {searchQueryParam && tabItems.length === 0 && loading && <Loader />}
    </div>
  );
};

export default ExploreV1;
