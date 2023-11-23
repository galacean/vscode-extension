interface IProjectFileMeta {
  /** 创建时间 */
  gmtCreate: Date;

  /** 修改时间 */
  gmtModified: Date;
}

interface IAssetFileMeta {
  /** 创建时间 */
  gmtCreate: Date;

  /** 修改时间 */
  gmtModified: Date;

  /** 类型 */
  type?: 'shader' | 'script';

  /** 从服务端拉取文件资产的md5 */
  md5?: string;
}
