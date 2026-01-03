export const generateToken = () => {
  return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const sanitizeData = (data) => {
  if (!data) return {};

  const dataObj = typeof data === 'string' ? JSON.parse(data) : data;
  const sanitized = JSON.parse(JSON.stringify(dataObj));

  if (sanitized.metadata?.title) {
    sanitized.metadata.title = sanitized.metadata.title.replace(/[']/g, "'");
  }

  return sanitized;
};

export const saveEvaluationData = async (token, data) => {
  if (!token || !data) {
    console.error('Missing required parameters for saving evaluation');
    return false;
  }

  if (
    !process.env.NEXT_PUBLIC_GITHUB_OWNER ||
    !process.env.NEXT_PUBLIC_GITHUB_REPO ||
    !process.env.NEXT_PUBLIC_GITHUB_TOKEN
  ) {
    console.error('Missing GitHub environment configuration');
    return false;
  }

  try {
    const sanitizedData = sanitizeData(data);
    const content = Buffer.from(JSON.stringify(sanitizedData, null, 2)).toString("base64");
    const filename = `src/data/evaluations/${token}.json`;

    const apiUrl = `https://api.github.com/repos/${process.env.NEXT_PUBLIC_GITHUB_OWNER}/${process.env.NEXT_PUBLIC_GITHUB_REPO}/contents/${filename}`;

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add evaluation data for token ${token}`,
        content: content,
        committer: {
          name: "Smart Paper Bot",
          email: "bot@smartpaper.dev"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub Contents API error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving evaluation to GitHub:', error);
    return false;
  }
};