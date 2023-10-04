#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
"""Lightdash source module"""

import traceback
from typing import Iterable, List, Optional

from metadata.generated.schema.api.data.createChart import CreateChartRequest
from metadata.generated.schema.api.data.createDashboard import CreateDashboardRequest
from metadata.generated.schema.api.lineage.addLineage import AddLineageRequest
from metadata.generated.schema.entity.data.chart import Chart
from metadata.generated.schema.entity.services.connections.dashboard.lightdashConnection import (
    LightdashConnection,
)
from metadata.generated.schema.entity.services.connections.metadata.openMetadataConnection import (
    OpenMetadataConnection,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.ingestion.api.steps import InvalidSourceException
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.ingestion.source.dashboard.dashboard_service import DashboardServiceSource
from metadata.ingestion.source.dashboard.lightdash.models import (
    LightdashChart,
    LightdashDashboard,
)
from metadata.utils import fqn
from metadata.utils.filters import filter_by_chart
from metadata.utils.helpers import clean_uri, replace_special_with
from metadata.utils.logger import ingestion_logger

logger = ingestion_logger()


class LightdashSource(DashboardServiceSource):
    """
    Lightdash Source Class
    """

    config: WorkflowSource
    metadata_config: OpenMetadataConnection

    @classmethod
    def create(cls, config_dict, metadata: OpenMetadata):
        config = WorkflowSource.parse_obj(config_dict)
        connection: LightdashConnection = config.serviceConnection.__root__.config
        if not isinstance(connection, LightdashConnection):
            raise InvalidSourceException(
                f"Expected LightdashConnection, but got {connection}"
            )
        return cls(config, metadata)

    def __init__(
        self,
        config: WorkflowSource,
        metadata: OpenMetadata,
    ):
        super().__init__(config, metadata)
        self.charts: List[LightdashChart] = []

    def prepare(self):
        self.charts = self.client.get_charts_list()
        return super().prepare()

    def get_dashboards_list(self) -> Optional[List[LightdashDashboard]]:
        """
        Get List of all dashboards
        """
        return self.client.get_dashboards_list()

    def get_dashboard_name(self, dashboard: LightdashDashboard) -> str:
        """
        Get Dashboard Name
        """
        return dashboard.name

    def get_dashboard_details(
        self, dashboard: LightdashDashboard
    ) -> LightdashDashboard:
        """
        Get Dashboard Details
        """
        return dashboard

    def yield_dashboard(
        self, dashboard_details: LightdashDashboard
    ) -> Iterable[CreateDashboardRequest]:
        """
        Method to Get Dashboard Entity
        """
        try:
            dashboard_url = (
                f"{clean_uri(self.service_connection.hostPort)}/dashboard/{dashboard_details.uuid}-"
                f"{replace_special_with(raw=dashboard_details.name.lower(), replacement='-')}"
            )
            dashboard_request = CreateDashboardRequest(
                name=dashboard_details.uuid,
                sourceUrl=dashboard_url,
                displayName=dashboard_details.name,
                description=dashboard_details.description,
                charts=[
                    fqn.build(
                        self.metadata,
                        entity_type=Chart,
                        service_name=self.context.dashboard_service.fullyQualifiedName.__root__,
                        chart_name=chart.name.__root__,
                    )
                    for chart in self.context.charts
                ],
                service=self.context.dashboard_service.fullyQualifiedName.__root__,
            )
            yield dashboard_request
            self.register_record(dashboard_request=dashboard_request)
        except Exception as exc:  # pylint: disable=broad-except
            logger.debug(traceback.format_exc())
            logger.warning(
                f"Error creating dashboard [{dashboard_details.name}]: {exc}"
            )

    def yield_dashboard_chart(
        self, dashboard_details: LightdashChart
    ) -> Optional[Iterable[CreateChartRequest]]:
        """Get chart method

        Args:
            dashboard_details:
        Returns:
            Iterable[CreateChartRequest]
        """
        charts = self.charts
        for chart in charts:
            try:
                chart_url = (
                    f"{clean_uri(self.service_connection.hostPort)}/question/{chart.uuid}-"
                    f"{replace_special_with(raw=chart.name.lower(), replacement='-')}"
                )
                if filter_by_chart(self.source_config.chartFilterPattern, chart.name):
                    self.status.filter(chart.name, "Chart Pattern not allowed")
                    continue
                yield CreateChartRequest(
                    name=chart.uuid,
                    displayName=chart.name,
                    description=chart.description,
                    sourceUrl=chart_url,
                    service=self.context.dashboard_service.fullyQualifiedName.__root__,
                )
                self.status.scanned(chart.name)
            except Exception as exc:  # pylint: disable=broad-except
                logger.debug(traceback.format_exc())
                logger.warning(f"Error creating chart [{chart}]: {exc}")

    def yield_dashboard_lineage_details(
        self,
        dashboard_details: LightdashDashboard,
        db_service_name: Optional[str],
    ) -> Optional[Iterable[AddLineageRequest]]:
        """Get lineage method

        Args:
            dashboard_details
        """
