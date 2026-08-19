export interface TeamProfile {
  homeDistrict?: string;
  districtDistribution: Record<string, number>; // { '강서구': 8, '양천구': 2 } 팀원 거주지 분포
  memberCount: number;
  isRegisteredTeam: boolean;
}
