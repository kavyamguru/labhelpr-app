declare module "jstat" {
  interface JStatDistribution {
    pdf(x: number, ...params: number[]): number;
    cdf(x: number, ...params: number[]): number;
    inv(p: number, ...params: number[]): number;
    mean(...params: number[]): number;
    variance(...params: number[]): number;
  }

  interface JStatStatic {
    studentt: JStatDistribution;
    normal: JStatDistribution;
    chisquare: JStatDistribution;
    beta: JStatDistribution;
    gamma: JStatDistribution;
    ftest: JStatDistribution;
  }

  const jStat: JStatStatic;
  export default jStat;
}
