import { useState, useCallback } from "react";
import ConfirmationDialog from "../components/ConfirmationDialog";

export default function useInfoDialog() {
  const [data, setData] = useState({ visible: false, title: "", message: "" });

  const hide = useCallback(() => {
    setData((d) => ({ ...d, visible: false }));
  }, []);

  const show = useCallback((title, message) => {
    setData({ visible: true, title, message });
  }, []);

  const dialog = (
    <ConfirmationDialog
      visible={data.visible}
      title={data.title}
      message={data.message}
      onConfirm={hide}
      onCancel={hide}
      actions={[{ label: "OK", onPress: hide }]}
    />
  );

  return [show, dialog];
}
