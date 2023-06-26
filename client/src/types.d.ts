interface IUserInfo {
  email: string;
  operatorName: string;
  nickName: string;
  accessCode: number;
}

interface IPaginationResponse<T> {
  total: number;
  list: T[];
  pageNo: number;
  pageSize: number;
}

interface IProjectListItem extends IProject {
  memberList: [
    {
      role: number;
      mail: string;
      name: string;
      avatar: string;
      status: number;
      last_login: string;
      cdnUsed: number;
      id: number;
      gmtCreate: string;
      gmtModified: string;
    }
  ];
}

interface IProject {
  name: string;
  description: string;
  creator: number;
  platform: string;
  engineVersion: string;
  setting: string;
  thumbnail: string;
  content: string;
  status: number;
  locked_by: number;
  id: number;
  gmtCreate: string;
  gmtModified: string;
}
