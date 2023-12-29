type IResponse<T> = ISuccessResponse<T> | IFailedResponse;

interface IFailedResponse<T = any> {
  data?: T;
  success: false;
  message?: string;
  errCode?: number;
}

interface ISuccessResponse<T> {
  data: T;
  success: true;
  traceId: string;
}

interface IUserInfo {
  id: string;
  mail: string;
  name: string;
  avatar: string;
  last_login: string;
}

interface IPaginationResponse<T> extends IPaginationParams {
  /** 符合查询条件的总记录数 */
  total: number;
  list: Array<T>;
}

interface IPaginationParams {
  /** 页码, 下标从0开始 */
  pageNo: number;
  pageSize: number;
}

interface IProject extends BaseModel {
  /** 项目名称 */
  name: string;

  /** 项目描述 */
  description?: string;
}

interface BaseModel {
  /** 主键 */
  id: number;

  /** 创建时间 */
  gmtCreate: string;

  /** 修改时间 */
  gmtModified: string;
}

type EProjectAssetType = 0 /** 普通文件 */ | 1 /** 文件夹 */;
type EPejectAssetStatus = 0 /** 正常 */ | 1; /** 删除 */

interface IAsset extends BaseModel {
  name: string;

  /** 文件or文件夹 */
  type: EProjectAssetType;

  /** 前端上传的uuid */
  uuid: string;

  /** 父资产(文件夹)uuid */
  parentId?: string;

  /** meta数据 */
  meta: string;

  url?: string;

  /** 所属项目 */
  projectId: number;

  /** 状态: 正常 删除 */
  status: EPejectAssetStatus;
}

type IProjectDetail = IProject & { assets: IAsset[] };

interface IProjectAssetCreate {
  name: string;
  type: number;
  uuid: string;
  /** 父资产uuid */
  parentId?: string;
  meta: string;
  url?: string;
  projectId: number;
  size?: number;
}
