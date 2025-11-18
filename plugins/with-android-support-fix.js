const {
  withAppBuildGradle,
  withGradleProperties,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const PLUGIN_NAME = "with-android-support-fix";
const SUPPORT_V4_EXCLUDE = `configurations {
    all {
        exclude group: "com.android.support", module: "support-v4"
    }
}`;

/**
 * Ensures the Gradle script excludes the legacy support-v4 dependency from every configuration.
 * @param {string} contents
 * @returns {string}
 */
function ensureSupportV4Exclusion(contents) {
  if (contents.includes('exclude group: "com.android.support", module: "support-v4"')) {
    return contents;
  }

  const insertion = `\n${SUPPORT_V4_EXCLUDE}\n\n`;
  const dependencyBlock = contents.match(/\n\s*dependencies\s*\{/);

  if (dependencyBlock) {
    const index = dependencyBlock.index;
    return contents.slice(0, index) + insertion + contents.slice(index);
  }

  return contents.trimEnd() + insertion;
}

/**
 * Ensures a Gradle property is present and set to the provided value.
 * @param {Array} properties
 * @param {string} key
 * @param {string} value
 */
function ensureGradleProperty(properties, key, value) {
  const existing = properties.find((item) => item.type === "property" && item.key === key);

  if (existing) {
    existing.value = value;
    return properties;
  }

  properties.push({ type: "property", key, value });
  return properties;
}

const withAndroidSupportFix = (config) => {
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      return config;
    }

    config.modResults.contents = ensureSupportV4Exclusion(config.modResults.contents);
    return config;
  });

  config = withGradleProperties(config, (config) => {
    config.modResults = ensureGradleProperty(config.modResults, "android.useAndroidX", "true");
    config.modResults = ensureGradleProperty(config.modResults, "android.enableJetifier", "true");
    return config;
  });

  return config;
};

module.exports = createRunOncePlugin(withAndroidSupportFix, PLUGIN_NAME, "1.0.0");
