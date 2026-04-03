export function parseDatasource<T = unknown>(
  raw: RawDatasourceVO
): DatasourceVO<T> {
  return {
    ...raw,
    linkJson: JSON.parse(raw.linkJson || '{}')
  };
}

export function parseDatasourceType(
  raw: RawDatasourceTypeVO
): DatasourceTypeVO {
  return {
    ...raw,
    schemaJson: JSON.parse(raw.schemaJson || '{}')
  };
}

export interface RawDatasourceVO {
  datasourceId: string;
  datasourceName: string;
  description?: string;

  datasourceType: string;
  datasourceVersion?: string;

  linkJson: string; // 字符串

  createUserId?: string;
  createUsername?: string;
  updateUserId?: string;
  updateUsername?: string;

  createTime?: string;
  updateTime?: string;
}

export interface RawDatasourceTypeVO {
  typeCode: string;
  typeName: string;
  schemaJson: string; // 字符串
}

// ========================
// 基础VO，和后端返回的不一样
// ========================

export interface DatasourceVO<T = unknown> {
    datasourceId: string;
    datasourceName: string;
    description?: string;

    datasourceType: string;
    datasourceVersion?: string;

    linkJson: T;

    createUserId?: string;
    createUsername?: string;
    updateUserId?: string;
    updateUsername?: string;

    createTime?: string;
    updateTime?: string;
}

export interface DatasourceTypeVO {
    typeCode: string;   // Kafka / MySQL / Hive
    typeName: string;
    schemaJson: any;
}
