import { request } from './requests';

export function getProjectList(pageNo = 0, pageSize = 20) {
  return request<IPaginationResponse<IProjectListItem>>({
    method: 'GET',
    url: '/api/project/list',
    params: { pageNo, pageSize },
  });
}
