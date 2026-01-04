/**
 * Formats a camelCase tag to a readable format with proper spacing and capitalization
 * Examples:
 * - "devOps" -> "DevOps"
 * - "cloudSecurity" -> "Cloud Security"
 * - "kubernetes" -> "Kubernetes"
 * - "machineLearning" -> "Machine Learning"
 * - "iac" -> "IaC"
 * - "aws" -> "AWS"
 */
export function formatTag(tag: string): string {
  // Special cases that should be preserved exactly
  const specialCases: Record<string, string> = {
    'devOps': 'DevOps',
    'devops': 'DevOps',
    'iac': 'IaC',
    'aws': 'AWS',
    'ai': 'AI',
    'llm': 'LLM',
    'api': 'API',
    'ciCd': 'CI/CD',
    'cicd': 'CI/CD',
    'iam': 'IAM',
    'sdk': 'SDK',
    'cli': 'CLI',
    'gui': 'GUI',
    'ui': 'UI',
    'ux': 'UX',
    'ml': 'ML',
    'nlp': 'NLP',
    'gcp': 'GCP',
    'k8s': 'K8s',
    'eks': 'EKS',
    'ecs': 'ECS',
    'ec2': 'EC2',
    's3': 'S3',
    'rds': 'RDS',
    'vpc': 'VPC',
  };

  // Check if this is a special case
  const lowerTag = tag.toLowerCase();
  if (specialCases[lowerTag]) {
    return specialCases[lowerTag];
  }

  // Split camelCase into words
  const words = tag.replace(/([A-Z])/g, ' $1').trim();

  // Capitalize first letter of each word
  return words
    .split(' ')
    .map(word => {
      // Check if individual word is a special case
      const lowerWord = word.toLowerCase();
      if (specialCases[lowerWord]) {
        return specialCases[lowerWord];
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
