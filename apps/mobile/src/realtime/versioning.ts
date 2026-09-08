export type VersionAction="ignore"|"invalidate"|"refetch";
export function versionAction(local:number,incoming:number):VersionAction{if(incoming<=local)return "ignore";if(incoming===local+1)return "invalidate";return "refetch";}
