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

import { Card, Col, Row, Typography } from 'antd';
import { AxiosError } from 'axios';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TOTAL_ENTITY_CHART_COLOR } from '../../constants/DataInsight.constants';
import { DataReportIndex } from '../../generated/dataInsight/dataInsightChart';
import {
  DataInsightChartResult,
  DataInsightChartType,
} from '../../generated/dataInsight/dataInsightChartResult';
import { getAggregateChartData } from '../../rest/DataInsightAPI';
import { axisTickFormatter } from '../../utils/ChartUtils';
import { getGraphDataByEntityType } from '../../utils/DataInsightUtils';
import {
  getCurrentMillis,
  getEpochMillisForPastDays,
} from '../../utils/date-time/DateTimeUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import './DataInsightDetail.less';
import { EmptyGraphPlaceholder } from './EmptyGraphPlaceholder';
import TotalEntityInsightSummary from './TotalEntityInsightSummary.component';

interface Props {
  selectedDays: number;
}

const TotalEntityInsightV1: FC<Props> = ({ selectedDays }) => {
  const [totalEntitiesByType, setTotalEntitiesByType] =
    useState<DataInsightChartResult>();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { data, entities, total, relativePercentage, latestData } =
    useMemo(() => {
      return getGraphDataByEntityType(
        totalEntitiesByType?.data ?? [],
        DataInsightChartType.TotalEntitiesByType
      );
    }, [totalEntitiesByType]);

  const { t } = useTranslation();

  const fetchTotalEntitiesByType = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        startTs: getEpochMillisForPastDays(selectedDays),
        endTs: getCurrentMillis(),
        dataInsightChartName: DataInsightChartType.TotalEntitiesByType,
        dataReportIndex: DataReportIndex.EntityReportDataIndex,
      };
      const response = await getAggregateChartData(params);

      setTotalEntitiesByType(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    fetchTotalEntitiesByType().catch(() => {
      // error handled in parent
    });
  }, [selectedDays]);

  return (
    <Card
      className="total-data-insight-card"
      data-testid="entity-summary-card"
      id={DataInsightChartType.TotalEntitiesByType}
      loading={isLoading}>
      {data.length ? (
        <Row>
          <Col span={14}>
            <Typography.Text className="font-medium">
              {t('label.data-insight-total-entity-summary')}
            </Typography.Text>
            <div className="p-t-lg">
              <ResponsiveContainer height={250} width="100%">
                <AreaChart
                  data={data}
                  margin={{
                    top: 10,
                    right: 50,
                    left: -20,
                    bottom: 0,
                  }}
                  syncId="anyId">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis tickFormatter={(value) => axisTickFormatter(value)} />
                  <Tooltip />
                  {entities.map((entity, i) => (
                    <Area
                      dataKey={entity}
                      fill={TOTAL_ENTITY_CHART_COLOR[i]}
                      key={entity}
                      stroke={TOTAL_ENTITY_CHART_COLOR[i]}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Col>
          <Col span={10}>
            <TotalEntityInsightSummary
              entities={entities}
              latestData={latestData}
              relativePercentage={relativePercentage}
              selectedDays={selectedDays}
              total={total}
            />
          </Col>
        </Row>
      ) : (
        <Row>
          <Col span={14}>
            <Typography.Text className="font-medium">
              {t('label.data-insight-total-entity-summary')}
            </Typography.Text>
          </Col>
          <Col span={24}>
            <EmptyGraphPlaceholder />
          </Col>
        </Row>
      )}
    </Card>
  );
};

export default TotalEntityInsightV1;
