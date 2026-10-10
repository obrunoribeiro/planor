// Config plugin: adota o "scene-based life cycle" do UIKit no app iOS.
//
// Por quê: apps compilados com o SDK do iOS 27 (Xcode 27) não abrem sem isso — o UIKit derruba o
// app na inicialização ("UIScene life cycle is required for apps built with this SDK"). O Expo 57
// já traz o `ExpoAppSceneDelegate` (que cria a janela e sobe o React Native), mas o template do
// prebuild do SDK 57 ainda não o usa; o do SDK 58 já usa. Este plugin aplica no projeto gerado o
// mesmo que o template do 58 faz:
//   1. `Info.plist`: declara a cena principal com `EXExpoAppSceneDelegate` (nome Objective-C do
//      `ExpoAppSceneDelegate`, então não precisa criar um SceneDelegate.swift no projeto Xcode);
//   2. `AppDelegate.swift`: conforma a `ExpoReactNativeFactoryProvider` (é por aí que o delegate
//      da cena acha o factory) e para de criar a janela — quem cria agora é a cena.
//
// Quando o projeto subir pro Expo SDK 58, apagar este plugin (o template já faz isso sozinho).
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif\n/;

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withIosSceneLifecycle: esperava AppDelegate em Swift.');
    }
    let contents = cfg.modResults.contents;

    if (!contents.includes('ExpoReactNativeFactoryProvider')) {
      const before = contents;
      contents = contents.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
      if (contents === before) throw new Error('withIosSceneLifecycle: não achei a declaração do AppDelegate.');
    }

    if (WINDOW_BLOCK.test(contents)) {
      contents = contents.replace(
        WINDOW_BLOCK,
        '    // A janela é criada e o React Native é iniciado pela cena (EXExpoAppSceneDelegate),\n' +
          '    // exigência do SDK do iOS 27 — ver plugins/withIosSceneLifecycle.js.\n',
      );
    } else if (contents.includes('UIWindow(frame: UIScreen.main.bounds)')) {
      // O template mudou e o plugin não reconheceu: melhor falhar no prebuild do que gerar um app
      // que cria duas janelas.
      throw new Error('withIosSceneLifecycle: o AppDelegate mudou de formato; revisar o plugin.');
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};
