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

import { Form, FormProps, Input } from 'antd';
import Modal from 'antd/lib/modal/Modal';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ENTITY_NAME_REGEX } from '../../constants/regex.constants';
import { Table } from '../../generated/entity/data/table';
import { TestCaseParameterValue } from '../../generated/tests/testCase';
import {
  TestDataType,
  TestDefinition,
} from '../../generated/tests/testDefinition';
import { getTableDetailsByFQN } from '../../rest/tableAPI';
import { getTestDefinitionById, updateTestCaseById } from '../../rest/testAPI';
import { getNameFromFQN } from '../../utils/CommonUtils';
import { getEntityFqnFromEntityLink } from '../../utils/TableUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import RichTextEditor from '../common/rich-text-editor/RichTextEditor';
import { EditorContentRef } from '../common/rich-text-editor/RichTextEditor.interface';
import Loader from '../Loader/Loader';
import { EditTestCaseModalProps } from './AddDataQualityTest.interface';
import ParameterForm from './components/ParameterForm';

const EditTestCaseModal: React.FC<EditTestCaseModalProps> = ({
  visible,
  testCase,
  onCancel,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [selectedDefinition, setSelectedDefinition] =
    useState<TestDefinition>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOnSave, setIsLoadingOnSave] = useState(false);
  const [table, setTable] = useState<Table>();

  const markdownRef = useRef<EditorContentRef>();

  const isColumn = useMemo(
    () => testCase?.entityLink.includes('::columns::'),
    [testCase]
  );

  const GenerateParamsField = useCallback(() => {
    if (selectedDefinition?.parameterDefinition) {
      return <ParameterForm definition={selectedDefinition} table={table} />;
    }

    return;
  }, [testCase, selectedDefinition, table]);

  const fetchTestDefinitionById = async () => {
    setIsLoading(true);
    try {
      const definition = await getTestDefinitionById(
        testCase.testDefinition.id || ''
      );
      setSelectedDefinition(definition);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const createTestCaseObj = (value: {
    testName: string;
    params: Record<string, string | { [key: string]: string }[]>;
    testTypeId: string;
  }) => {
    const paramsValue = selectedDefinition?.parameterDefinition?.[0];

    const parameterValues = Object.entries(value.params || {}).map(
      ([key, value]) => ({
        name: key,
        value:
          paramsValue?.dataType === TestDataType.Array
            ? // need to send array as string formate
              JSON.stringify(
                (value as { value: string }[]).map((data) => data.value)
              )
            : value,
      })
    );

    return {
      parameterValues: parameterValues as TestCaseParameterValue[],
      description: markdownRef.current?.getEditorContent(),
    };
  };

  const handleFormSubmit: FormProps['onFinish'] = async (value) => {
    const { parameterValues, description } = createTestCaseObj(value);
    const updatedTestCase = {
      ...testCase,
      parameterValues,
      description,
      displayName: value.displayName,
    };
    const jsonPatch = compare(testCase, updatedTestCase);

    if (jsonPatch.length) {
      try {
        setIsLoadingOnSave(true);
        const updateRes = await updateTestCaseById(
          testCase.id ?? '',
          jsonPatch
        );
        onUpdate?.(updateRes);
        showSuccessToast(
          t('server.update-entity-success', { entity: t('label.test-case') })
        );
        onCancel();
        form.resetFields();
      } catch (error) {
        showErrorToast(error as AxiosError);
      } finally {
        setIsLoadingOnSave(false);
      }
    }
  };

  const getParamsValue = () => {
    return testCase?.parameterValues?.reduce(
      (acc, curr) => ({
        ...acc,
        [curr.name || '']:
          selectedDefinition?.parameterDefinition?.[0]?.dataType ===
          TestDataType.Array
            ? (JSON.parse(curr.value || '[]') as string[]).map((val) => ({
                value: val,
              }))
            : curr.value,
      }),
      {}
    );
  };

  const fetchTableDetails = async (fqn: string) => {
    try {
      const data = await getTableDetailsByFQN(fqn, '');
      setTable(data);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  useEffect(() => {
    if (testCase) {
      fetchTestDefinitionById();
      const tableFqn = getEntityFqnFromEntityLink(testCase?.entityLink);
      form.setFieldsValue({
        name: testCase?.name,
        testDefinition: testCase?.testDefinition?.name,
        displayName: testCase?.displayName,
        params: getParamsValue(),
        table: getNameFromFQN(tableFqn),
        column: getNameFromFQN(
          getEntityFqnFromEntityLink(testCase?.entityLink, isColumn)
        ),
      });

      const isContainsColumnName = testCase.parameterValues?.find(
        (value) => value.name === 'columnName'
      );

      if (isContainsColumnName) {
        fetchTableDetails(tableFqn);
      }
    }
  }, [testCase]);

  return (
    <Modal
      centered
      destroyOnClose
      afterClose={() => {
        form.resetFields();
        onCancel();
      }}
      cancelText={t('label.cancel')}
      closable={false}
      confirmLoading={isLoadingOnSave}
      maskClosable={false}
      okText={t('label.submit')}
      open={visible}
      title={`${t('label.edit')} ${testCase?.name}`}
      width={600}
      onCancel={onCancel}
      onOk={() => form.submit()}>
      {isLoading ? (
        <Loader />
      ) : (
        <Form
          data-testid="edit-test-form"
          form={form}
          layout="vertical"
          name="tableTestForm"
          onFinish={handleFormSubmit}>
          <Form.Item required label={t('label.table')} name="table">
            <Input disabled />
          </Form.Item>
          {isColumn && (
            <Form.Item required label={t('label.column')} name="column">
              <Input disabled />
            </Form.Item>
          )}
          <Form.Item
            required
            label={t('label.name')}
            name="name"
            rules={[
              {
                pattern: ENTITY_NAME_REGEX,
                message: t('message.entity-name-validation'),
              },
            ]}>
            <Input disabled placeholder={t('message.enter-test-case-name')} />
          </Form.Item>
          <Form.Item label={t('label.display-name')} name="displayName">
            <Input placeholder={t('message.enter-test-case-name')} />
          </Form.Item>
          <Form.Item
            required
            label={t('label.test-entity', {
              entity: t('label.type'),
            })}
            name="testDefinition">
            <Input disabled placeholder={t('message.enter-test-case-name')} />
          </Form.Item>

          {GenerateParamsField()}

          <Form.Item label={t('label.description')} name="description">
            <RichTextEditor
              height="200px"
              initialValue={testCase?.description || ''}
              ref={markdownRef}
              style={{
                margin: 0,
              }}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default EditTestCaseModal;
