import { EProjectAssetType } from '@/constants';
import { request } from './requests';

export function getProjectList(pageNo = 0, pageSize = 20) {
  return request<IPaginationResponse<IProjectListItem>>({
    method: 'GET',
    url: '/api/project/list',
    params: { pageNo, pageSize },
  });
}

export function fetchProjectAssetList(params: {
  projectId: number;
  type?: EProjectAssetType;
  pagination?: IPaginationParams;
}) {
  return request<IPaginationResponse<IProjectAsset>>({
    method: 'GET',
    url: `/api/project/${params.projectId}/asset/list`,
    params: { type: params.type, ...params.pagination },
  });
}
