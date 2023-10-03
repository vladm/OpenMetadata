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
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { DateRangeObject } from '../../../components/ProfilerDashboard/component/TestSummary';
import {
  INITIAL_OPERATION_METRIC_VALUE,
  INITIAL_ROW_METRIC_VALUE,
} from '../../../constants/profiler.constant';
import {
  getSystemProfileList,
  getTableProfilesList,
} from '../../../rest/tableAPI';
import {
  calculateRowCountMetrics,
  calculateSystemMetrics,
} from '../../../utils/TableProfilerUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import CustomBarChart from '../../Chart/CustomBarChart';
import OperationDateBarChart from '../../Chart/OperationDateBarChart';
import Loader from '../../Loader/Loader';
import ProfilerDetailsCard from '../../ProfilerDashboard/component/ProfilerDetailsCard';
import ProfilerLatestValue from '../../ProfilerDashboard/component/ProfilerLatestValue';
import { MetricChartType } from '../../ProfilerDashboard/profilerDashboard.interface';
import { TableProfilerChartProps } from '../TableProfiler.interface';

const TableProfilerChart = ({
  dateRangeObject,
  entityFqn = '',
}: TableProfilerChartProps) => {
  const { fqn: datasetFQN } = useParams<{ fqn: string }>();
  const { t } = useTranslation();

  const [rowCountMetrics, setRowCountMetrics] = useState<MetricChartType>(
    INITIAL_ROW_METRIC_VALUE
  );
  const [operationMetrics, setOperationMetrics] = useState<MetricChartType>(
    INITIAL_OPERATION_METRIC_VALUE
  );
  const [operationDateMetrics, setOperationDateMetrics] =
    useState<MetricChartType>(INITIAL_OPERATION_METRIC_VALUE);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTableProfiler = async (
    fqn: string,
    dateRangeObj: DateRangeObject
  ) => {
    try {
      const { data } = await getTableProfilesList(fqn, dateRangeObj);
      const rowMetricsData = calculateRowCountMetrics(data, rowCountMetrics);
      setRowCountMetrics(rowMetricsData);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };
  const fetchSystemProfiler = async (
    fqn: string,
    dateRangeObj: DateRangeObject
  ) => {
    try {
      const { data } = await getSystemProfileList(fqn, dateRangeObj);
      const { operationMetrics: metricsData, operationDateMetrics } =
        calculateSystemMetrics(data, operationMetrics);

      setOperationDateMetrics(operationDateMetrics);
      setOperationMetrics(metricsData);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const fetchProfilerData = async (
    fqn: string,
    dateRangeObj: DateRangeObject
  ) => {
    setIsLoading(true);
    await fetchTableProfiler(fqn, dateRangeObj);
    await fetchSystemProfiler(fqn, {
      startTs: dateRangeObj.startTs,
      endTs: dateRangeObj.endTs,
    });
    setIsLoading(false);
  };

  useEffect(() => {
    if (datasetFQN || entityFqn) {
      fetchProfilerData(datasetFQN || entityFqn, dateRangeObject);
    } else {
      setIsLoading(false);
    }
  }, [datasetFQN, dateRangeObject, entityFqn]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Row data-testid="table-profiler-chart-container" gutter={[16, 16]}>
      <Col data-testid="row-metrics" span={24}>
        <ProfilerDetailsCard
          chartCollection={rowCountMetrics}
          curveType="stepAfter"
          name="rowCount"
          title={t('label.data-volume')}
        />
      </Col>
      <Col span={24}>
        <Card
          className="shadow-none global-border-radius"
          data-testid="operation-date-metrics">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Typography.Title level={5}>
                {t('label.table-update-plural')}
              </Typography.Title>
            </Col>
            <Col span={4}>
              <ProfilerLatestValue
                stringValue
                information={operationDateMetrics.information}
              />
            </Col>
            <Col span={20}>
              <OperationDateBarChart
                chartCollection={operationDateMetrics}
                name="operationDateMetrics"
              />
            </Col>
          </Row>
        </Card>
      </Col>
      <Col span={24}>
        <Card
          className="shadow-none global-border-radius"
          data-testid="operation-metrics">
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Typography.Title level={5}>
                {t('label.volume-change')}
              </Typography.Title>
            </Col>
            <Col span={4}>
              <ProfilerLatestValue information={operationMetrics.information} />
            </Col>
            <Col span={20}>
              <CustomBarChart
                chartCollection={operationMetrics}
                name="operationMetrics"
              />
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

export default TableProfilerChart;
