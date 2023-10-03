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
  Badge,
  Button,
  Col,
  Dropdown,
  Input,
  InputRef,
  Popover,
  Row,
  Select,
  Space,
} from 'antd';
import { CookieStorage } from 'cookie-storage';
import i18next from 'i18next';
import { debounce, upperCase } from 'lodash';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import AppState from '../../AppState';
import { ReactComponent as DropDownIcon } from '../../assets/svg/DropDown.svg';
import { ReactComponent as DomainIcon } from '../../assets/svg/ic-domain.svg';
import { ReactComponent as Help } from '../../assets/svg/ic-help.svg';
import Logo from '../../assets/svg/logo-monogram.svg';
import { ActivityFeedTabs } from '../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.interface';
import SearchOptions from '../../components/AppBar/SearchOptions';
import Suggestions from '../../components/AppBar/Suggestions';
import BrandImage from '../../components/common/BrandImage/BrandImage';
import { useDomainProvider } from '../../components/Domain/DomainProvider/DomainProvider';
import { useGlobalSearchProvider } from '../../components/GlobalSearchProvider/GlobalSearchProvider';
import WhatsNewAlert from '../../components/Modals/WhatsNewModal/WhatsNewAlert/WhatsNewAlert.component';
import {
  globalSearchOptions,
  NOTIFICATION_READ_TIMER,
  SOCKET_EVENTS,
} from '../../constants/constants';
import { EntityTabs, EntityType } from '../../enums/entity.enum';
import {
  hasNotificationPermission,
  shouldRequestPermission,
} from '../../utils/BrowserNotificationUtils';
import { getEntityDetailLink, refreshPage } from '../../utils/CommonUtils';
import {
  getEntityFQN,
  getEntityType,
  prepareFeedLink,
} from '../../utils/FeedUtils';
import {
  languageSelectOptions,
  SupportedLocales,
} from '../../utils/i18next/i18nextUtil';
import { isCommandKeyPress, Keys } from '../../utils/KeyboardUtil';
import {
  inPageSearchOptions,
  isInPageSearchAllowed,
} from '../../utils/RouterUtils';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import Avatar from '../common/avatar/Avatar';
import CmdKIcon from '../common/CmdKIcon/CmdKIcon.component';
import WhatsNewModal from '../Modals/WhatsNewModal/WhatsNewModal';
import NotificationBox from '../NotificationBox/NotificationBox.component';
import { useWebSocketConnector } from '../web-scoket/web-scoket.provider';
import './nav-bar.less';
import { NavBarProps } from './NavBar.interface';

const cookieStorage = new CookieStorage();

const NavBar = ({
  supportDropdown,
  profileDropdown,
  searchValue,
  isFeatureModalOpen,
  isTourRoute = false,
  pathname,
  username,
  isSearchBoxOpen,
  handleSearchBoxOpen,
  handleFeatureModal,
  handleSearchChange,
  handleKeyDown,
  handleOnClick,
  handleClear,
}: NavBarProps) => {
  const { searchCriteria, updateSearchCriteria } = useGlobalSearchProvider();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  // get current user details
  const currentUser = useMemo(
    () => AppState.getCurrentUserDetails(),
    [AppState.userDetails, AppState.nonSecureUserDetails]
  );
  const history = useHistory();
  const { domainOptions, activeDomain, updateActiveDomain } =
    useDomainProvider();
  const { t } = useTranslation();
  const { Option } = Select;
  const searchRef = useRef<InputRef>(null);
  const [searchIcon, setSearchIcon] = useState<string>('icon-searchv1');
  const [cancelIcon, setCancelIcon] = useState<string>(
    Icons.CLOSE_CIRCLE_OUTLINED
  );
  const [suggestionSearch, setSuggestionSearch] = useState<string>('');
  const [hasTaskNotification, setHasTaskNotification] =
    useState<boolean>(false);
  const [hasMentionNotification, setHasMentionNotification] =
    useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('Task');
  const [isImgUrlValid, setIsImgUrlValid] = useState<boolean>(true);

  const entitiesSelect = useMemo(
    () => (
      <Select
        defaultActiveFirstOption
        className="global-search-select"
        data-testid="global-search-selector"
        listHeight={300}
        popupClassName="global-search-select-menu"
        value={searchCriteria}
        onChange={updateSearchCriteria}>
        {globalSearchOptions.map(({ value, label }) => (
          <Option
            data-testid={`global-search-select-option-${label}`}
            key={value}
            value={value}>
            {label}
          </Option>
        ))}
      </Select>
    ),
    [searchCriteria, globalSearchOptions]
  );

  const profilePicture = useMemo(
    () => currentUser?.profile?.images?.image512,
    [currentUser]
  );

  const language = useMemo(
    () =>
      (cookieStorage.getItem('i18next') as SupportedLocales) ||
      SupportedLocales.English,
    []
  );

  const { socket } = useWebSocketConnector();

  const debouncedOnChange = useCallback(
    (text: string): void => {
      setSuggestionSearch(text);
    },
    [setSuggestionSearch]
  );

  const debounceOnSearch = useCallback(debounce(debouncedOnChange, 400), [
    debouncedOnChange,
  ]);

  const handleTaskNotificationRead = () => {
    setHasTaskNotification(false);
  };

  const handleMentionsNotificationRead = () => {
    setHasMentionNotification(false);
  };

  const handleBellClick = useCallback(
    (visible: boolean) => {
      if (visible) {
        switch (activeTab) {
          case 'Task':
            hasTaskNotification &&
              setTimeout(() => {
                handleTaskNotificationRead();
              }, NOTIFICATION_READ_TIMER);

            break;

          case 'Conversation':
            hasMentionNotification &&
              setTimeout(() => {
                handleMentionsNotificationRead();
              }, NOTIFICATION_READ_TIMER);

            break;
        }
      }
    },
    [hasTaskNotification]
  );

  const handleActiveTab = (key: string) => {
    setActiveTab(key);
  };

  const showBrowserNotification = (
    about: string,
    createdBy: string,
    type: string
  ) => {
    if (!hasNotificationPermission()) {
      return;
    }
    const entityType = getEntityType(about);
    const entityFQN = getEntityFQN(about) ?? '';
    let body;
    let path: string;
    switch (type) {
      case 'Task':
        body = t('message.user-assign-new-task', {
          user: createdBy,
        });

        path = getEntityDetailLink(
          entityType as EntityType,
          entityFQN,
          EntityTabs.ACTIVITY_FEED,
          ActivityFeedTabs.TASKS
        );

        break;
      case 'Conversation':
        body = t('message.user-mentioned-in-comment', {
          user: createdBy,
        });
        path = prepareFeedLink(entityType as string, entityFQN as string);
    }
    const notification = new Notification('Notification From OpenMetadata', {
      body: body,
      icon: Logo,
    });
    notification.onclick = () => {
      const isChrome = window.navigator.userAgent.indexOf('Chrome');
      // Applying logic to open a new window onclick of browser notification from chrome
      // As it does not open the concerned tab by default.
      if (isChrome > -1) {
        window.open(path);
      } else {
        history.push(path);
      }
    };
  };

  const handleKeyPress = useCallback((event) => {
    if (isCommandKeyPress(event) && event.key === Keys.K) {
      searchRef.current?.focus();
      event.preventDefault();
    }
  }, []);

  useEffect(() => {
    if (shouldRequestPermission()) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on(SOCKET_EVENTS.TASK_CHANNEL, (newActivity) => {
        if (newActivity) {
          const activity = JSON.parse(newActivity);
          setHasTaskNotification(true);
          showBrowserNotification(
            activity.about,
            activity.createdBy,
            activity.type
          );
        }
      });

      socket.on(SOCKET_EVENTS.MENTION_CHANNEL, (newActivity) => {
        if (newActivity) {
          const activity = JSON.parse(newActivity);
          setHasMentionNotification(true);
          showBrowserNotification(
            activity.about,
            activity.createdBy,
            activity.type
          );
        }
      });
    }

    return () => {
      socket && socket.off(SOCKET_EVENTS.TASK_CHANNEL);
      socket && socket.off(SOCKET_EVENTS.MENTION_CHANNEL);
    };
  }, [socket]);

  useEffect(() => {
    const targetNode = document.body;
    targetNode.addEventListener('keydown', handleKeyPress);

    return () => targetNode.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    if (profilePicture) {
      setIsImgUrlValid(true);
    }
  }, [profilePicture]);

  const handleDomainChange = useCallback(({ key }) => {
    updateActiveDomain(key);
    refreshPage();
  }, []);

  const handleLanguageChange = useCallback(({ key }) => {
    i18next.changeLanguage(key);
    refreshPage();
  }, []);

  const handleModalCancel = useCallback(() => handleFeatureModal(false), []);

  const handleOnImageError = useCallback(() => {
    setIsImgUrlValid(false);
  }, []);

  const handleSelectOption = useCallback(
    (text) => {
      AppState.inPageSearchText = text;
    },
    [AppState]
  );

  return (
    <>
      <div className="navbar-container bg-white flex-nowrap w-full">
        <Link className="flex-shrink-0" id="openmetadata_logo" to="/">
          <BrandImage
            isMonoGram
            alt="OpenMetadata Logo"
            className="vertical-middle"
            dataTestId="image"
            height={30}
            width={30}
          />
        </Link>
        <div
          className="m-auto relative"
          data-testid="navbar-search-container"
          ref={searchContainerRef}>
          <Popover
            content={
              !isTourRoute &&
              searchValue &&
              (isInPageSearchAllowed(pathname) ? (
                <SearchOptions
                  isOpen={isSearchBoxOpen}
                  options={inPageSearchOptions(pathname)}
                  searchText={searchValue}
                  selectOption={handleSelectOption}
                  setIsOpen={handleSearchBoxOpen}
                />
              ) : (
                <Suggestions
                  isOpen={isSearchBoxOpen}
                  searchCriteria={
                    searchCriteria === '' ? undefined : searchCriteria
                  }
                  searchText={suggestionSearch}
                  setIsOpen={handleSearchBoxOpen}
                />
              ))
            }
            getPopupContainer={() =>
              searchContainerRef.current || document.body
            }
            open={isSearchBoxOpen}
            overlayClassName="global-search-overlay"
            overlayStyle={{ width: '100%', paddingTop: 0 }}
            placement="bottomRight"
            showArrow={false}
            trigger={['click']}
            onOpenChange={handleSearchBoxOpen}>
            <Input
              addonBefore={entitiesSelect}
              autoComplete="off"
              className="rounded-4  appbar-search"
              data-testid="searchBox"
              id="searchBox"
              placeholder={t('message.search-for-entity-types')}
              ref={searchRef}
              style={{
                height: '37px',
              }}
              suffix={
                <span className="d-flex items-center">
                  <CmdKIcon />
                  <span className="cursor-pointer m-b-xs m-l-sm w-4 h-4 text-center">
                    {searchValue ? (
                      <SVGIcons
                        alt="icon-cancel"
                        icon={cancelIcon}
                        onClick={handleClear}
                      />
                    ) : (
                      <SVGIcons
                        alt="icon-search"
                        icon={searchIcon}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOnClick();
                        }}
                      />
                    )}
                  </span>
                </span>
              }
              type="text"
              value={searchValue}
              onBlur={() => {
                setSearchIcon('icon-searchv1');
                setCancelIcon(Icons.CLOSE_CIRCLE_OUTLINED);
              }}
              onChange={(e) => {
                const { value } = e.target;
                debounceOnSearch(value);
                handleSearchChange(value);
              }}
              onFocus={() => {
                setSearchIcon('icon-searchv1color');
                setCancelIcon(Icons.CLOSE_CIRCLE_OUTLINED_COLOR);
              }}
              onKeyDown={handleKeyDown}
            />
          </Popover>
        </div>

        <Space align="center" size={24}>
          <Dropdown
            className="cursor-pointer"
            menu={{
              items: domainOptions,
              onClick: handleDomainChange,
            }}
            placement="bottomRight"
            trigger={['click']}>
            <Row gutter={6}>
              <Col className="flex-center">
                <DomainIcon
                  className="d-flex text-base-color"
                  height={18}
                  name="folder"
                  width={18}
                />
              </Col>
              <Col>{activeDomain}</Col>
              <Col className="flex-center">
                <DropDownIcon height={14} width={14} />
              </Col>
            </Row>
          </Dropdown>

          <Dropdown
            destroyPopupOnHide
            className="cursor-pointer"
            dropdownRender={() => (
              <NotificationBox
                hasMentionNotification={hasMentionNotification}
                hasTaskNotification={hasTaskNotification}
                onMarkMentionsNotificationRead={handleMentionsNotificationRead}
                onMarkTaskNotificationRead={handleTaskNotificationRead}
                onTabChange={handleActiveTab}
              />
            )}
            overlayStyle={{
              zIndex: 9999,
              width: '425px',
              minHeight: '375px',
            }}
            placement="bottomRight"
            trigger={['click']}
            onOpenChange={handleBellClick}>
            <Badge dot={hasTaskNotification || hasMentionNotification}>
              <SVGIcons
                alt="Alert bell icon"
                icon={Icons.ALERT_BELL}
                width="18"
              />
            </Badge>
          </Dropdown>

          <Dropdown
            className="cursor-pointer"
            menu={{
              items: languageSelectOptions,
              onClick: handleLanguageChange,
            }}
            placement="bottomRight"
            trigger={['click']}>
            <Row gutter={2}>
              <Col>
                {upperCase(
                  (language || SupportedLocales.English).split('-')[0]
                )}
              </Col>
              <Col className="flex-center">
                <DropDownIcon height={14} width={14} />
              </Col>
            </Row>
          </Dropdown>

          <Dropdown
            className="cursor-pointer m-t-xss"
            menu={{ items: supportDropdown }}
            overlayStyle={{ width: 175 }}
            placement="bottomRight"
            trigger={['click']}>
            <Help height={20} width={20} />
          </Dropdown>
          <div className="profile-dropdown" data-testid="dropdown-profile">
            <Dropdown
              menu={{
                items: profileDropdown,
              }}
              trigger={['click']}>
              <Button
                icon={
                  isImgUrlValid ? (
                    <img
                      alt="user"
                      className="profile-image circle"
                      referrerPolicy="no-referrer"
                      src={profilePicture || ''}
                      width={24}
                      onError={handleOnImageError}
                    />
                  ) : (
                    <Avatar name={username} type="circle" width="24" />
                  )
                }
                type="text"
              />
            </Dropdown>
          </div>
        </Space>
      </div>
      <WhatsNewModal
        header={`${t('label.whats-new')}!`}
        visible={isFeatureModalOpen}
        onCancel={handleModalCancel}
      />
      <WhatsNewAlert />
    </>
  );
};

export default NavBar;
