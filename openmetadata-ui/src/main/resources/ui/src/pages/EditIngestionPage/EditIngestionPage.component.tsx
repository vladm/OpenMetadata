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

import { AxiosError } from 'axios';
import { isEmpty } from 'lodash';
import { ServicesUpdateRequest } from 'Models';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import AddIngestion from '../../components/AddIngestion/AddIngestion.component';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
import ResizablePanels from '../../components/common/ResizablePanels/ResizablePanels';
import ServiceDocPanel from '../../components/common/ServiceDocPanel/ServiceDocPanel';
import TitleBreadcrumb from '../../components/common/title-breadcrumb/title-breadcrumb.component';
import { TitleBreadcrumbProps } from '../../components/common/title-breadcrumb/title-breadcrumb.interface';
import Loader from '../../components/Loader/Loader';
import {
  DEPLOYED_PROGRESS_VAL,
  getServiceDetailsPath,
  INGESTION_PROGRESS_END_VAL,
  INGESTION_PROGRESS_START_VAL,
} from '../../constants/constants';
import { INGESTION_ACTION_TYPE } from '../../constants/Ingestions.constant';
import { FormSubmitType } from '../../enums/form.enum';
import { IngestionActionMessage } from '../../enums/ingestion.enum';
import { ServiceCategory } from '../../enums/service.enum';
import { CreateIngestionPipeline } from '../../generated/api/services/ingestionPipelines/createIngestionPipeline';
import {
  IngestionPipeline,
  PipelineType,
} from '../../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { useAirflowStatus } from '../../hooks/useAirflowStatus';
import { DataObj } from '../../interface/service.interface';
import {
  deployIngestionPipelineById,
  getIngestionPipelineByFqn,
  updateIngestionPipeline,
} from '../../rest/ingestionPipelineAPI';
import { getServiceByFQN } from '../../rest/serviceAPI';
import { getEntityMissingError } from '../../utils/CommonUtils';
import {
  getBreadCrumbsArray,
  getIngestionHeadingName,
  getSettingsPathFromPipelineType,
} from '../../utils/IngestionUtils';
import { getServiceType } from '../../utils/ServiceUtils';
import { showErrorToast } from '../../utils/ToastUtils';

const EditIngestionPage = () => {
  const { t } = useTranslation();
  const { fetchAirflowStatus } = useAirflowStatus();
  const {
    ingestionFQN,
    ingestionType,
    fqn: serviceFQN,
    serviceCategory,
  } = useParams<{
    ingestionFQN: string;
    ingestionType: string;
    fqn: string;
    serviceCategory: string;
  }>();
  const history = useHistory();
  const [serviceData, setServiceData] = useState<ServicesUpdateRequest>();
  const [ingestionData, setIngestionData] = useState<IngestionPipeline>(
    {} as IngestionPipeline
  );
  const [activeIngestionStep, setActiveIngestionStep] = useState(1);
  const [isLoading, setIsloading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | JSX.Element>('');
  const [ingestionProgress, setIngestionProgress] = useState(0);
  const [isIngestionCreated, setIsIngestionCreated] = useState(false);
  const [isIngestionDeployed, setIsIngestionDeployed] = useState(false);
  const [ingestionAction, setIngestionAction] = useState(
    IngestionActionMessage.UPDATING
  );
  const [showIngestionButton, setShowIngestionButton] = useState(false);
  const [slashedBreadcrumb, setSlashedBreadcrumb] = useState<
    TitleBreadcrumbProps['titleLinks']
  >([]);
  const [activeField, setActiveField] = useState<string>('');

  const isSettingsPipeline = useMemo(
    () =>
      ingestionType === PipelineType.DataInsight ||
      ingestionType === PipelineType.ElasticSearchReindex,
    [ingestionType]
  );

  const fetchServiceDetails = () => {
    return new Promise<void>((resolve, reject) => {
      getServiceByFQN(serviceCategory, serviceFQN)
        .then((resService) => {
          if (resService) {
            setServiceData(resService as ServicesUpdateRequest);
            resolve();
          } else {
            showErrorToast(
              t('server.entity-fetch-error', {
                entity: t('label.service-detail-lowercase-plural'),
              })
            );
          }
        })
        .catch((error: AxiosError) => {
          if (error.response?.status === 404) {
            setErrorMsg(getEntityMissingError(serviceCategory, serviceFQN));
          } else {
            const errTextService = t('server.entity-fetch-error', {
              entity: t('label.service-detail-lowercase-plural'),
            });
            showErrorToast(error, errTextService);
            setErrorMsg(errTextService);
          }
          reject();
        });
    });
  };

  const fetchIngestionDetails = () => {
    return new Promise<void>((resolve, reject) => {
      getIngestionPipelineByFqn(ingestionFQN, ['pipelineStatuses'])
        .then((res) => {
          if (res) {
            setIngestionData(res);
            resolve();
          } else {
            throw t('server.unexpected-error');
          }
        })
        .catch((error: AxiosError) => {
          if (error.response?.status === 404) {
            setErrorMsg(getEntityMissingError('Ingestion', ingestionFQN));
          } else {
            const errTextIngestion = t('server.entity-fetch-error', {
              entity: t('label.ingestion-workflow'),
            });
            showErrorToast(error, errTextIngestion);
            setErrorMsg(errTextIngestion);
          }
          reject();
        });
    });
  };

  const fetchData = () => {
    const promises = [fetchServiceDetails(), fetchIngestionDetails()];
    Promise.allSettled(promises).finally(() => setIsloading(false));
  };

  const onIngestionDeploy = () => {
    return new Promise<void>((resolve) => {
      setIsIngestionCreated(true);
      setIngestionProgress(INGESTION_PROGRESS_END_VAL);
      setIngestionAction(IngestionActionMessage.DEPLOYING);

      deployIngestionPipelineById(ingestionData.id as string)
        .then(() => {
          setIsIngestionDeployed(true);
          setShowIngestionButton(false);
          setIngestionProgress(DEPLOYED_PROGRESS_VAL);
          setIngestionAction(IngestionActionMessage.DEPLOYED);
        })
        .catch((err: AxiosError) => {
          setShowIngestionButton(true);
          setIngestionAction(IngestionActionMessage.DEPLOYING_ERROR);
          showErrorToast(
            err,
            t('server.deploy-entity-error', {
              entity: t('label.ingestion-workflow'),
            })
          );
        })
        .finally(() => resolve());
    });
  };

  const onEditIngestionSave = (data: IngestionPipeline) => {
    if (!ingestionData.deployed) {
      setIngestionProgress(INGESTION_PROGRESS_START_VAL);
    }
    const {
      airflowConfig,
      description,
      displayName,
      loggerLevel,
      name,
      owner,
      pipelineType,
      service,
      sourceConfig,
    } = data;
    const updateData = {
      airflowConfig,
      description,
      displayName,
      loggerLevel,
      name,
      owner,
      pipelineType,
      service,
      sourceConfig,
    };

    return new Promise<void>((resolve, reject) => {
      return updateIngestionPipeline(updateData as CreateIngestionPipeline)
        .then((res) => {
          if (res) {
            onIngestionDeploy();
            resolve();
          } else {
            throw t('server.entity-updating-error', {
              entity: t('label.ingestion-workflow-lowercase'),
            });
          }
        })
        .catch((err: AxiosError) => {
          showErrorToast(
            err,
            t('server.entity-updating-error', {
              entity: t('label.ingestion-workflow-lowercase'),
            })
          );
          reject();
        });
    });
  };

  const goToSettingsPage = () => {
    history.push(getSettingsPathFromPipelineType(ingestionType));
  };

  const goToService = () => {
    history.push(
      getServiceDetailsPath(serviceFQN, serviceCategory, 'ingestions')
    );
  };

  const handleCancelClick = isSettingsPipeline ? goToSettingsPage : goToService;

  const handleFieldFocus = (fieldName: string) => {
    if (isEmpty(fieldName)) {
      return;
    }
    setTimeout(() => {
      setActiveField(fieldName);
    }, 50);
  };

  useEffect(() => {
    const breadCrumbsArray = getBreadCrumbsArray(
      isSettingsPipeline,
      ingestionType,
      serviceCategory,
      serviceFQN,
      INGESTION_ACTION_TYPE.EDIT,
      serviceData
    );
    setSlashedBreadcrumb(breadCrumbsArray);
  }, [serviceCategory, ingestionType, serviceData, isSettingsPipeline]);

  const firstPanelChildren = (
    <div className="max-width-md w-9/10 service-form-container">
      <TitleBreadcrumb titleLinks={slashedBreadcrumb} />
      <div className="m-t-md">
        <AddIngestion
          activeIngestionStep={activeIngestionStep}
          data={ingestionData}
          handleCancelClick={handleCancelClick}
          handleViewServiceClick={handleCancelClick}
          heading={getIngestionHeadingName(
            ingestionType,
            INGESTION_ACTION_TYPE.EDIT
          )}
          ingestionAction={ingestionAction}
          ingestionProgress={ingestionProgress}
          isIngestionCreated={isIngestionCreated}
          isIngestionDeployed={isIngestionDeployed}
          pipelineType={ingestionType as PipelineType}
          serviceCategory={serviceCategory as ServiceCategory}
          serviceData={serviceData as DataObj}
          setActiveIngestionStep={(step) => setActiveIngestionStep(step)}
          showDeployButton={showIngestionButton}
          status={FormSubmitType.EDIT}
          onFocus={handleFieldFocus}
          onIngestionDeploy={onIngestionDeploy}
          onSuccessSave={goToService}
          onUpdateIngestion={onEditIngestionSave}
        />
      </div>
    </div>
  );

  const secondPanelChildren = (
    <ServiceDocPanel
      isWorkflow
      activeField={activeField}
      serviceName={serviceData?.serviceType ?? ''}
      serviceType={getServiceType(serviceCategory as ServiceCategory)}
      workflowType={ingestionType as PipelineType}
    />
  );

  useEffect(() => {
    fetchAirflowStatus().finally(() => {
      fetchData();
    });
  }, [serviceCategory, serviceFQN]);

  if (isLoading) {
    return <Loader />;
  }
  if (errorMsg) {
    return <ErrorPlaceHolder>{errorMsg}</ErrorPlaceHolder>;
  }

  return (
    <ResizablePanels
      firstPanel={{ children: firstPanelChildren, minWidth: 700, flex: 0.7 }}
      pageTitle={t('label.edit-entity', {
        entity: t('label.ingestion'),
      })}
      secondPanel={{
        children: secondPanelChildren,
        className: 'service-doc-panel',
        minWidth: 60,
        overlay: {
          displayThreshold: 200,
          header: t('label.setup-guide'),
          rotation: 'counter-clockwise',
        },
      }}
    />
  );
};

export default EditIngestionPage;
